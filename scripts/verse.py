"""Print SBLGNT verses: python3 scripts/verse.py mk 1:41-43 mt 8:3"""
import json, sys
from common import OUT
args = sys.argv[1:]
for g, spec in zip(args[::2], args[1::2]):
    vs = json.loads((OUT / "gospels" / f"{g}.json").read_text())
    c, rng = spec.split(":")
    a, b = (rng.split("-") + [rng])[:2]
    for v in vs:
        cc, vv = map(int, v["r"].split(":"))
        if cc == int(c) and int(a) <= vv <= int(b):
            print(f"{g} {v['r']}: " + " ".join(t[0] for t in v["w"]) + f"   | {v['en']}")
