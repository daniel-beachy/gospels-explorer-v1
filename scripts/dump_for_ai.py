"""Write a plain-text dump of each unit's computed data for the AI note writers.
Tokens are numbered per Gospel so notes can cite exact words."""
import json
from common import OUT, ROOT
LV = {3: "=", 2: "~", 1: "≈"}
NAMES = {"mt": "MATTHEW", "mk": "MARK", "lk": "LUKE", "jn": "JOHN"}
dest = ROOT / "data" / "ai" / "dumps"; dest.mkdir(parents=True, exist_ok=True)
variants = json.loads((OUT / "variants.json").read_text())
idx = json.loads((OUT / "index.json").read_text())
for u in idx["units"]:
    d = json.loads((OUT / "units" / f"{u['id']}.json").read_text())
    L = [f"UNIT {d['id']} — {d['title']}  [tradition: {d['tradition']}]",
         "REFS " + "; ".join(f"{NAMES[g]} {r}" for g, r in d["refs"].items()), ""]
    for g, tx in d["text"].items():
        L.append(f"=== {NAMES[g]} {d['refs'][g]} — Greek (SBLGNT), tokens numbered; tags show alignment with other Gospels: = same form, ~ same word different form, ≈ synonym")
        cur, line = None, []
        vi = 0
        # token -> verse mapping by counting words per verse from gospel file is overkill; use verse list + English
        parts = []
        for i, (t, al) in enumerate(zip(tx["tokens"], tx["align"])):
            tag = "".join(f"{o}{LV[l]}" for o, (j, l) in sorted(al.items()))
            parts.append(f"{i}:{t[0]}" + (f"[{tag}]" if tag else ""))
        L.append(" ".join(parts))
        L.append(f"--- {NAMES[g]} English (BSB):")
        for v in tx["verses"]:
            L.append(f"{v} {tx['en'].get(v, '')}")
        vs = [v for v in tx["verses"] if v in variants[g]]
        if vs:
            L.append(f"--- {NAMES[g]} textual variants (TAGNT: NA=modern critical text, TR=Textus Receptus/KJV Greek):")
            for v in vs:
                ws = variants[g][v]
                tr_only = " ".join(w[0] for w in ws if w[3] and not w[2])
                na_only = " ".join(w[0] for w in ws if w[2] and not w[3])
                br = " ".join(w[0] for w in ws if w[4])
                bits = []
                if tr_only: bits.append(f"TR adds: {tr_only}")
                if na_only: bits.append(f"NA only: {na_only}")
                if br: bits.append(f"double-bracketed in NA (doubtful): {br[:120]}")
                notes = {w[6][:200] for w in ws if w[6]}
                if notes: bits.append("notes: " + " | ".join(list(notes)[:3]))
                if bits: L.append(f"{v}: " + " ; ".join(bits))
        L.append("")
    if d["pairs"]:
        L.append("PAIRWISE AGREEMENT (computed): " + "; ".join(
            f"{k}: {v['pctA']}% of {k[:2]} / {v['pctB']}% of {k[3:]} words aligned, longest identical run {v['run']} words" + (f" ({v['runText']})" if v['run'] >= 4 else "")
            for k, v in d["pairs"].items()))
    sig = [m for m in d["minor"] if m["sig"]]
    if sig:
        L.append("MINOR AGREEMENTS (Matthew+Luke agree, Mark lacks): " + ", ".join(f"mt#{m['mt']}/lk#{m['lk']} {m['word']} '{m['gloss']}'" for m in sig))
    (dest / f"{d['id']}.txt").write_text("\n".join(L))
print("dumped", len(idx["units"]))
