"""Build all site data from the raw open datasets.

Inputs (data/raw, see scripts/fetch_data.sh):
  macula-sblgnt.tsv   MACULA Greek (SBLGNT): words, lemmas, morphology, glosses, Louw-Nida senses
  tagnt-mat-jhn.txt   STEPBible TAGNT: words with the editions that contain them
  bsb.txt             Berean Standard Bible (public domain)
  ../pericopes.txt    parallel-passage table

Outputs (public/data):
  gospels/{g}.json    every verse: Greek tokens + BSB English
  units/{id}.json     one synopsis unit: tokens per Gospel with word-level alignment
  index.json          unit list, map segments, global statistics
  variants.json       verses where the critical text (NA) and the Textus Receptus differ
  fingerprints.json   distinctive vocabulary per Gospel
"""
import json, math, re, unicodedata
from collections import Counter, defaultdict
from common import *

CONTENT = {"noun", "verb", "adj", "adv", "num", "intj"}
EXACT, LEMMA, SYN = 3, 2, 1


def strip_accents(s):
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(ch for ch in s if unicodedata.category(ch) != "Mn")


def clean_gloss(g):
    return re.sub(r"[\[\]]", "", g or "").strip()


# ---------------------------------------------------------------- text
def load_tokens():
    by_g = {g: [] for g in GOSPELS}
    for r in load_macula():
        ln = (r["ln"] or "").split(" ")[0]
        by_g[r["g"]].append({
            "c": r["ch"], "v": r["v"], "w": r["w"],
            "t": r["text"], "a": r["after"].replace(" ", " "),
            "l": r["lemma"], "n": strip_accents(r["normalized"] or r["text"]),
            "g": clean_gloss(r["gloss"] or r["english"]),
            "m": r["morph"], "s": r["strong"], "ln": ln, "k": r["class"],
            "dom": (r["domain"] or "").split(" ")[0],
        })
    return by_g


def load_bsb():
    out = {g: {} for g in GOSPELS}
    for line in (RAW / "bsb.txt").read_text(encoding="utf-8-sig").splitlines():
        m = re.match(r"^(Matthew|Mark|Luke|John) (\d+):(\d+)\t(.*)$", line)
        if m:
            out[BSB_BOOK[m[1]]][f"{int(m[2])}:{int(m[3])}"] = m[4].strip()
    return out


# ------------------------------------------------------------ alignment
def match_level(a, b):
    if a["l"] != b["l"]:
        if a["k"] in CONTENT and b["k"] in CONTENT and a["ln"] and a["ln"] == b["ln"]:
            return SYN
        return 0
    return EXACT if a["n"] == b["n"] else LEMMA


def score(level, tok):
    if level == 0:
        return 0
    if tok["k"] in CONTENT:
        return {EXACT: 4.0, LEMMA: 3.0, SYN: 2.0}[level]
    return {EXACT: 1.5, LEMMA: 1.0, SYN: 0.5}[level]


def align_pair(A, B):
    """Weighted LCS (order-preserving). Returns {i: (j, level)}."""
    n, m = len(A), len(B)
    lv = [[match_level(A[i], B[j]) for j in range(m)] for i in range(n)]
    D = [[0.0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        Di, Dn, li = D[i], D[i + 1], lv[i]
        for j in range(m - 1, -1, -1):
            best = Dn[j] if Dn[j] > Di[j + 1] else Di[j + 1]
            if li[j]:
                s = score(li[j], A[i]) + Dn[j + 1]
                if s > best:
                    best = s
            Di[j] = best
    pairs, i, j = {}, 0, 0
    while i < n and j < m:
        if lv[i][j] and abs(D[i][j] - (score(lv[i][j], A[i]) + D[i + 1][j + 1])) < 1e-9:
            pairs[i] = (j, lv[i][j]); i += 1; j += 1
        elif D[i + 1][j] >= D[i][j + 1]:
            i += 1
        else:
            j += 1
    # Keep diagonal runs only if they contain a content word, or are >= 3 long:
    # a lone "and the" is not evidence of literary dependence.
    keep, run = {}, []
    def flush():
        if run and (len(run) >= 3 or any(A[i]["k"] in CONTENT and l >= LEMMA for i, _, l in run)):
            for i, j, l in run:
                keep[i] = (j, l)
        run.clear()
    for i in sorted(pairs):
        j, l = pairs[i]
        if run and not (run[-1][0] == i - 1 and run[-1][1] == j - 1):
            flush()
        run.append((i, j, l))
    flush()
    # Synonym matches only count when anchored by nearby agreement.
    for i, (j, l) in list(keep.items()):
        if l == SYN and not any(k in keep and keep[k][1] >= LEMMA for k in range(i - 3, i + 4) if k != i):
            del keep[i]
    usedA, usedB = set(keep), {j for j, _ in keep.values()}

    def add(i, j):
        keep[i] = (j, EXACT if A[i]["n"] == B[j]["n"] else LEMMA)
        usedA.add(i); usedB.add(j)

    # Second pass: transposed runs of >= 3 lemma matches outside the main alignment.
    for i in range(n - 2):
        if i in usedA:
            continue
        for j in range(m - 2):
            if j in usedB:
                continue
            L = 0
            while (i + L < n and j + L < m and i + L not in usedA and j + L not in usedB
                   and A[i + L]["l"] == B[j + L]["l"]):
                L += 1
            if L >= 3 and any(A[i + k]["k"] in CONTENT for k in range(L)):
                for k in range(L):
                    add(i + k, j + k)
                break
    # Third pass: unaligned content words near an aligned neighbour, matched to the
    # same lemma near that neighbour's partner (catches small local reorderings).
    for _ in range(2):
        for i in range(n):
            if i in usedA or A[i]["k"] not in CONTENT:
                continue
            anchors = [k for k in range(i - 4, i + 5) if k in keep and keep[k][1] >= LEMMA]
            if not anchors:
                continue
            a = min(anchors, key=lambda k: abs(k - i))
            exp = keep[a][0] + (i - a)
            cands = [j for j in range(max(0, exp - 6), min(m, exp + 7))
                     if j not in usedB and B[j]["l"] == A[i]["l"]]
            if cands:
                add(i, min(cands, key=lambda j: abs(j - exp)))
    return keep


def mark_has_nearby(seq, align, i):
    """True if Mark has the same lemma near where Matthew's word i would fall
    (i.e. Mark has the word, just in a different order)."""
    mt, mk = seq["mt"], seq["mk"]
    prev = next((align["mt"][k]["mk"][0] for k in range(i - 1, -1, -1) if "mk" in align["mt"][k]), 0)
    nxt = next((align["mt"][k]["mk"][0] for k in range(i + 1, len(mt)) if "mk" in align["mt"][k]), len(mk) - 1)
    lo, hi = max(0, min(prev, nxt) - 4), min(len(mk), max(prev, nxt) + 5)
    return any(mk[j]["l"] == mt[i]["l"] for j in range(lo, hi))


def longest_run(A, pairs):
    best = cur = 0
    best_end = -1
    prev = None
    for i in range(len(A)):
        p = pairs.get(i)
        if p and p[1] == EXACT and prev is not None and p[0] == prev + 1 and cur:
            cur += 1
        elif p and p[1] == EXACT:
            cur = 1
        else:
            cur = 0
        prev = p[0] if p else None
        if cur > best:
            best, best_end = cur, i
    return best, best_end - best + 1 if best else -1


def tradition(gs):
    s = set(gs) - {"jn"}
    if s == {"mt", "mk", "lk"}: return "triple"
    if s == {"mt", "lk"}: return "double"
    if s == {"mt", "mk"}: return "mt-mk"
    if s == {"mk", "lk"}: return "mk-lk"
    if s == {"mt"}: return "mt-only"
    if s == {"mk"}: return "mk-only"
    if s == {"lk"}: return "lk-only"
    return "jn-only"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "units").mkdir(exist_ok=True)
    (OUT / "gospels").mkdir(exist_ok=True)
    toks = load_tokens()
    bsb = load_bsb()
    variants, doubtful = build_variants()

    verse_max = {g: defaultdict(int) for g in GOSPELS}
    verse_toks = {g: defaultdict(list) for g in GOSPELS}
    for g in GOSPELS:
        for t in toks[g]:
            verse_max[g][t["c"]] = max(verse_max[g][t["c"]], t["v"])
            verse_toks[g][(t["c"], t["v"])].append(t)
    mark_doubtful(verse_toks, doubtful)

    # ---- per-Gospel reading files
    units = load_pericopes()
    verse_unit = {g: {} for g in GOSPELS}
    for u in units:
        for g, spec in u["refs"].items():
            u.setdefault("verses", {})[g] = parse_ranges(spec, verse_max[g])
            for cv in u["verses"][g]:
                verse_unit[g][cv] = u["id"]
    for g in GOSPELS:
        verses = []
        for c in sorted(verse_max[g]):
            for v in range(1, verse_max[g][c] + 1):
                key = f"{c}:{v}"
                verses.append({
                    "r": key, "u": verse_unit[g].get((c, v)),
                    "en": bsb[g].get(key, ""),
                    "w": [pack(t) for t in verse_toks[g].get((c, v), [])],
                    "var": 1 if key in variants[g] else 0,
                })
        dump(OUT / "gospels" / f"{g}.json", verses)

    # ---- synopsis units
    index_units, totals = [], defaultdict(lambda: Counter())
    minor_all = []
    for u in units:
        gs = [g for g in GOSPELS if g in u["refs"]]
        seq = {g: [t for cv in u["verses"][g] for t in verse_toks[g].get(cv, [])] for g in gs}
        align = {g: [dict() for _ in seq[g]] for g in gs}
        pair_stats = {}
        for x in range(len(gs)):
            for y in range(x + 1, len(gs)):
                a, b = gs[x], gs[y]
                if not seq[a] or not seq[b]:
                    continue
                p = align_pair(seq[a], seq[b])
                for i, (j, l) in p.items():
                    align[a][i][b] = [j, l]
                    align[b][j][a] = [i, l]
                ex = sum(1 for _, l in p.values() if l == EXACT)
                lm = sum(1 for _, l in p.values() if l == LEMMA)
                run, start = longest_run(seq[a], p)
                pair_stats[f"{a}-{b}"] = {
                    "exact": ex, "lemma": lm,
                    "pctA": round(100 * (ex + lm) / len(seq[a]), 1),
                    "pctB": round(100 * (ex + lm) / len(seq[b]), 1),
                    "run": run,
                    "runText": " ".join(t["t"] for t in seq[a][start:start + run]) if run else "",
                }
                totals[f"{a}-{b}"].update({"exact": ex, "lemma": lm,
                                            a: len(seq[a]), b: len(seq[b])})
        # Minor agreements: Matthew and Luke agree against Mark.
        minors = []
        if {"mt", "mk", "lk"} <= set(gs):
            for i, al in enumerate(align["mt"]):
                if "lk" in al and "mk" not in al:
                    j = al["lk"][0]
                    if "mk" in align["lk"][j] or mark_has_nearby(seq, align, i):
                        continue
                    minors.append({"mt": i, "lk": j, "l": al["lk"][1],
                                   "word": seq["mt"][i]["t"], "gloss": seq["mt"][i]["g"],
                                   "content": int(seq["mt"][i]["k"] in CONTENT)})
            # A minor agreement is significant if it is a content word or part of a run.
            idx = {m["mt"] for m in minors}
            for m in minors:
                m["sig"] = int(bool(m["content"]) or (m["mt"] - 1 in idx) or (m["mt"] + 1 in idx))
            minor_all.extend({"unit": u["id"], **m} for m in minors if m["sig"])
        unit_out = {
            "id": u["id"], "title": u["title"], "section": u["section"], "refs": u["refs"],
            "tradition": tradition(gs),
            "text": {g: {
                "tokens": [pack(t) for t in seq[g]],
                "align": align[g],
                "verses": [f"{c}:{v}" for c, v in u["verses"][g]],
                "en": {f"{c}:{v}": bsb[g].get(f"{c}:{v}", "") for c, v in u["verses"][g]},
            } for g in gs},
            "pairs": pair_stats,
            "minor": minors,
        }
        dump(OUT / "units" / f"{u['id']}.json", unit_out)
        index_units.append({
            "id": u["id"], "title": u["title"], "section": u["section"], "refs": u["refs"],
            "tradition": tradition(gs), "jn": "jn" in gs,
            "words": {g: len(seq[g]) for g in gs},
            "pairs": {k: {kk: v[kk] for kk in ("pctA", "pctB", "run")} for k, v in pair_stats.items()},
            "minor": sum(m["sig"] for m in minors),
            "variants": sum(1 for g in gs for c, v in u["verses"][g] if f"{c}:{v}" in variants[g]),
        })

    # ---- map: each Gospel as an ordered list of segments
    segs = {}
    for g in GOSPELS:
        out, cur = [], None
        for c in sorted(verse_max[g]):
            for v in range(1, verse_max[g][c] + 1):
                uid = verse_unit[g][(c, v)]
                n = len(verse_toks[g].get((c, v), []))
                if cur and cur["u"] == uid and cur["end"] == prev:
                    cur["end"] = f"{c}:{v}"; cur["n"] += n
                else:
                    cur = {"u": uid, "start": f"{c}:{v}", "end": f"{c}:{v}", "n": n}
                    out.append(cur)
                prev = f"{c}:{v}"
        segs[g] = out

    # How much of Mark reappears in Matthew and Luke, across all shared units
    mark_reuse = {}
    for other in ("mt", "lk"):
        hit = tot = 0
        for u in units:
            if "mk" in u["refs"] and other in u["refs"]:
                d = json.loads((OUT / "units" / f"{u['id']}.json").read_text())
                for al in d["text"]["mk"]["align"]:
                    tot += 1
                    hit += 1 if other in al else 0
        mark_reuse[other] = round(100 * hit / tot, 1) if tot else 0
    mk_total = len(toks["mk"])
    mk_in_either = 0
    for u in units:
        if "mk" in u["refs"]:
            d = json.loads((OUT / "units" / f"{u['id']}.json").read_text())
            for al in d["text"]["mk"]["align"]:
                if "mt" in al or "lk" in al:
                    mk_in_either += 1

    words = {g: len(toks[g]) for g in GOSPELS}
    trad_words = defaultdict(Counter)
    for iu in index_units:
        for g, n in iu["words"].items():
            trad_words[g][iu["tradition"] if g != "jn" else ("jn-shared" if len(iu["words"]) > 1 else "jn-only")] += n

    chapters = {}
    for g in GOSPELS:
        off, starts = 0, []
        for c in sorted(verse_max[g]):
            starts.append(off)
            off += sum(len(verse_toks[g].get((c, v), [])) for v in range(1, verse_max[g][c] + 1))
        chapters[g] = starts
    dump(OUT / "index.json", {
        "units": index_units,
        "segments": segs,
        "chapters": chapters,
        "stats": {
            "words": words,
            "markReuse": mark_reuse,
            "markWordsEchoed": round(100 * mk_in_either / mk_total, 1),
            "traditionWords": trad_words,
            "pairTotals": {k: dict(v) for k, v in totals.items()},
            "minorAgreements": len(minor_all),
        },
    })
    dump(OUT / "minor_agreements.json", minor_all)
    dump(OUT / "variants.json", variants)
    dump(OUT / "fingerprints.json", fingerprints(toks))
    print("units", len(index_units), "minor agreements", len(minor_all))
    print("mark reuse", mark_reuse, "mark echoed", round(100 * mk_in_either / mk_total, 1))


def pack(t):
    # [surface, following punctuation, lemma, gloss, morph, class, strong, louw-nida, verse, doubtful]
    return [t["t"], t["a"], t["l"], t["g"], t["m"], t["k"], t["s"], t["ln"], f"{t['c']}:{t['v']}", t.get("d", 0)]


def dump(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")))


# -------------------------------------------------------------- variants
def build_variants():
    """Verses where NA (modern critical text) and TR (KJV's Greek) differ, from TAGNT.
    Also returns, per verse, the SBL-edition words that sit inside [[double brackets]]
    (passages modern editors print but judge not to be original)."""
    out = {g: {} for g in GOSPELS}
    doubtful = {g: {} for g in GOSPELS}
    sbl_words = {g: {} for g in GOSPELS}
    in_br, book = False, None
    with open(RAW / "tagnt-mat-jhn.txt", encoding="utf-8-sig") as f:
        for line in f:
            m = re.match(r"^(Mat|Mrk|Luk|Jhn)\.(\d+)\.(\d+)(?:\S*?)#(\d+)=(\S+)\t", line)
            if not m:
                continue
            cols = line.rstrip("\n").split("\t")
            g = TAGNT_BOOK[m[1]]
            if g != book:
                book, in_br = g, False
            key = f"{int(m[2])}:{int(m[3])}"
            wtype = m[5]
            bare = re.sub(r"\([^)]*\)", "", wtype)
            in_na = "N" in bare or "n" in bare or "NA28" in cols[5]  # bracketed passages are typed KO but printed in NA28
            in_tr = "K" in bare or "k" in bare
            raw = cols[1]
            if "[[" in raw:
                in_br = True
            bracket = in_br
            if "]]" in raw:
                in_br = False
            greek = re.sub(r"\s*\(.*?\)\s*$", "", raw).strip()
            greek = greek.replace("[[", "").replace("]]", "").replace("¶", "")
            major = any(ch.isupper() for ch in wtype)
            entry = [greek, cols[2].strip(), int(in_na), int(in_tr), int(bracket),
                     int(major and wtype != "NKO"), cols[6].strip() if len(cols) > 6 else ""]
            out[g].setdefault(key, []).append(entry)
            if "SBL" in cols[5] or "NA28" in cols[5]:
                sbl_words[g].setdefault(key, []).append(strip_accents(re.sub(r"[^\w]", "", greek)))
                if bracket:
                    doubtful[g].setdefault(key, []).append(strip_accents(re.sub(r"[^\w]", "", greek)))
    for g in GOSPELS:
        for key in list(out[g]):
            ws = out[g][key]
            if not any(w[2] != w[3] or w[4] or w[5] for w in ws):
                del out[g][key]
        for key, ws in doubtful[g].items():
            doubtful[g][key] = {"all": len(ws) == len(sbl_words[g][key]), "words": ws}
    return out, doubtful


def mark_doubtful(verse_toks, doubtful):
    """Flag MACULA tokens that fall inside double-bracketed passages."""
    n = 0
    for g in GOSPELS:
        for key, d in doubtful[g].items():
            c, v = map(int, key.split(":"))
            toks = verse_toks[g].get((c, v), [])
            if d["all"]:
                idx = range(len(toks))
            else:
                plain = [strip_accents(re.sub(r"[^\w]", "", t["t"])) for t in toks]
                w = d["words"]
                start = next((i for i in range(len(plain)) if plain[i:i + 3] == w[:3]), None)
                if start is None:
                    print("WARN: cannot place bracketed words", g, key); continue
                idx = range(start, min(len(toks), start + len(w)))
            for i in idx:
                toks[i]["d"] = 1; n += 1
    print("doubtful tokens", n)


# ---------------------------------------------------------- fingerprints
def fingerprints(toks):
    """Distinctive lemmas per Gospel: weighted log-odds with an informative
    Dirichlet prior (Monroe, Colaresi & Quinn 2008)."""
    counts = {g: Counter(t["l"] for t in toks[g]) for g in GOSPELS}
    gloss = {}
    for g in GOSPELS:
        for t in toks[g]:
            gloss.setdefault(t["l"], Counter())[t["g"].lower()] += 1
    allc = Counter()
    for c in counts.values():
        allc.update(c)
    a0 = sum(allc.values())
    out = {}
    for g in GOSPELS:
        rest = Counter()
        for h in GOSPELS:
            if h != g:
                rest.update(counts[h])
        n1, n2 = sum(counts[g].values()), sum(rest.values())
        scored = []
        for w, aw in allc.items():
            y1, y2 = counts[g][w], rest[w]
            if y1 < 4:
                continue
            l1 = math.log((y1 + aw) / (n1 + a0 - y1 - aw))
            l2 = math.log((y2 + aw) / (n2 + a0 - y2 - aw))
            var = 1 / (y1 + aw) + 1 / (y2 + aw)
            z = (l1 - l2) / math.sqrt(var)
            scored.append((z, w, y1))
        scored.sort(reverse=True)
        out[g] = [{
            "lemma": w, "z": round(z, 2), "count": y1,
            "per1000": round(1000 * y1 / n1, 2),
            "others": {h: round(1000 * counts[h][w] / sum(counts[h].values()), 2) for h in GOSPELS if h != g},
            "gloss": gloss[w].most_common(1)[0][0],
        } for z, w, y1 in scored[:40]]
    return out


if __name__ == "__main__":
    main()
