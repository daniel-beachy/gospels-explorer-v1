"""Compile the AI-written notes into public/data/notes.json.

Sources (all written by Claude Opus 5.5, see data/ai/BRIEF.md):
  data/ai/notes/*.json        per-unit short notes and deep readings
  data/ai/discoveries.json    the map's discovery pins
  data/ai/gospels.json        one portrait paragraph per Gospel (fingerprints page)

Every cite marker {g c:v words} is resolved against the SBLGNT tokens of that
verse. Unresolvable markers fail the build, so citations cannot drift from the data.
"""
import json, re, sys, unicodedata
from common import OUT, ROOT

AI = ROOT / "data" / "ai"
MARK = re.compile(r"\{(mt|mk|lk|jn) (\d+:\d+) ([^}]+)\}")
gospel_cache = {}
errors = []


def plain(s):
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(ch for ch in s if unicodedata.category(ch) != "Mn" and ch.isalpha())


def verse_tokens(g, ref):
    if g not in gospel_cache:
        gospel_cache[g] = {v["r"]: v["w"] for v in json.loads((OUT / "gospels" / f"{g}.json").read_text())}
    return gospel_cache[g].get(ref, [])


def find_run(words, toks):
    want = [plain(w) for w in words.split() if plain(w)]
    have = [plain(t[0]) for t in toks]
    for i in range(len(have) - len(want) + 1):
        if have[i:i + len(want)] == want:
            return list(range(i, i + len(want)))
    return None


def rich(text, where, unit=None):
    """Replace markers with ⟦n⟧ and resolve each to unit token indices."""
    cites = []
    def sub(m):
        g, ref, words = m[1], m[2], m[3].strip()
        toks = verse_tokens(g, ref)
        run = find_run(words, toks)
        if run is None:
            errors.append(f"{where}: cannot find '{words}' in {g} {ref}: " + " ".join(t[0] for t in toks))
            return words
        # map verse-local token indexes to the unit's token sequence
        tokens = []
        if unit and g in unit["text"]:
            seq = unit["text"][g]["tokens"]
            first = next((i for i, t in enumerate(seq) if t[8] == ref), None)
            if first is not None:
                tokens = [first + i for i in run]
        surface = " ".join(toks[i][0] for i in run)
        cites.append({"g": g, "ref": ref, "words": surface, "tokens": tokens})
        return f"⟦{len(cites) - 1}⟧"
    out = MARK.sub(sub, text)
    if "{" in out and re.search(r"\{(mt|mk|lk|jn)", out):
        errors.append(f"{where}: malformed marker in: {out[:120]}")
    return {"text": out, "cites": cites}


def unit_for(uid):
    p = OUT / "units" / f"{uid}.json"
    return json.loads(p.read_text()) if p.exists() else None


def main():
    notes = {}
    for f in sorted((AI / "notes").glob("*.json")):
        for n in json.loads(f.read_text()):
            u = unit_for(n["id"])
            if u is None:
                errors.append(f"{f.name}: unknown unit {n['id']}"); continue
            deep = None
            if n.get("deep"):
                deep = {"lede": rich(n["deep"]["lede"], n["id"], u),
                        "sections": [{"heading": s["heading"], "body": rich(s["body"], n["id"], u)}
                                     for s in n["deep"]["sections"]]}
            notes[n["id"]] = {"id": n["id"], "note": rich(n["note"], n["id"], u), "deep": deep}
    discoveries = []
    p = AI / "discoveries.json"
    if p.exists():
        for d in json.loads(p.read_text()):
            u = unit_for(d["unit"])
            discoveries.append({**d, "teaser": rich(d["teaser"], d["id"], u), "body": rich(d["body"], d["id"], u)})
    gospels = {}
    p = AI / "gospels.json"
    if p.exists():
        gospels = {g: rich(t, f"gospel-{g}") for g, t in json.loads(p.read_text()).items()}
    (OUT / "notes.json").write_text(json.dumps({"notes": notes, "discoveries": discoveries, "gospels": gospels},
                                               ensure_ascii=False, separators=(",", ":")))
    idx = json.loads((OUT / "index.json").read_text())
    missing = [u["id"] for u in idx["units"] if u["id"] not in notes]
    print(f"notes: {len(notes)} ({sum(1 for n in notes.values() if n['deep'])} deep), "
          f"discoveries: {len(discoveries)}, missing notes: {len(missing)}")
    if errors:
        print("\n".join(errors)); sys.exit(1)


if __name__ == "__main__":
    main()
