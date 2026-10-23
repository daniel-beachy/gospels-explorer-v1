"""Verify every verse of each Gospel is assigned to exactly one unit."""
from collections import defaultdict
from common import *

verses = {g: defaultdict(int) for g in GOSPELS}
for r in load_macula():
    verses[r["g"]][r["ch"]] = max(verses[r["g"]][r["ch"]], r["v"])
units = load_pericopes()
ids = [u["id"] for u in units]
assert len(ids) == len(set(ids)), "duplicate ids"
problems = 0
for g in GOSPELS:
    seen = defaultdict(list)
    for u in units:
        if g in u["refs"]:
            for cv in parse_ranges(u["refs"][g], verses[g]):
                seen[cv].append(u["id"])
    for c, n in sorted(verses[g].items()):
        for v in range(1, n + 1):
            if not seen.get((c, v)):
                print(f"MISSING {g} {c}:{v}"); problems += 1
            elif len(seen[(c, v)]) > 1:
                print(f"OVERLAP {g} {c}:{v} {seen[(c, v)]}"); problems += 1
    extra = [cv for cv in seen if cv[1] > verses[g].get(cv[0], 0)]
    for cv in extra:
        print(f"BEYOND {g} {cv}"); problems += 1
print(len(units), "units;", problems, "problems")
