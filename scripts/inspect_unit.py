"""Print a unit's alignment as text (debugging / AI-note grounding)."""
import json, sys
from common import OUT
LV = {3: "=", 2: "~", 1: "≈"}
def render(uid, show=None):
    d = json.loads((OUT / "units" / f"{uid}.json").read_text())
    print(f"## {d['title']} [{d['tradition']}]  refs={d['refs']}")
    for g, tx in d["text"].items():
        if show and g not in show: continue
        parts = []
        for t, al in zip(tx["tokens"], tx["align"]):
            tag = "".join(f"{o}{LV[l]}" for o, (j, l) in sorted(al.items()))
            parts.append(f"{t[0]}" + (f"[{tag}]" if tag else ""))
        print(f"\n### {g.upper()}\n" + " ".join(parts))
    print("\npairs", json.dumps(d["pairs"], ensure_ascii=False))
    print("minor", [(m["word"], m["gloss"]) for m in d["minor"]])
if __name__ == "__main__":
    render(sys.argv[1], sys.argv[2:] or None)
