"""Shared helpers for the data pipeline."""
import csv, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "public" / "data"
GOSPELS = ["mt", "mk", "lk", "jn"]
MACULA_BOOK = {"MAT": "mt", "MRK": "mk", "LUK": "lk", "JHN": "jn"}
TAGNT_BOOK = {"Mat": "mt", "Mrk": "mk", "Luk": "lk", "Jhn": "jn"}
BSB_BOOK = {"Matthew": "mt", "Mark": "mk", "Luke": "lk", "John": "jn"}


def parse_ranges(spec, verses_in_chapter):
    """'9:35-10:16;11:2' -> list of (ch, v) tuples, in order."""
    out = []
    for part in [p.strip() for p in spec.split(";") if p.strip()]:
        if "-" in part:
            a, b = part.split("-")
            c1, v1 = map(int, a.split(":"))
            if ":" in b:
                c2, v2 = map(int, b.split(":"))
            else:
                c2, v2 = c1, int(b)
        else:
            c1, v1 = map(int, part.split(":"))
            c2, v2 = c1, v1
        c, v = c1, v1
        while (c, v) <= (c2, v2):
            out.append((c, v))
            v += 1
            if v > verses_in_chapter.get(c, 0):
                c, v = c + 1, 1
    return out


def load_pericopes():
    units = []
    for line in (ROOT / "data" / "pericopes.txt").read_text().splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        cols = [c.strip() for c in line.split("|")]
        uid, section, title = cols[:3]
        refs = dict(zip(GOSPELS, cols[3:7]))
        units.append({"id": uid, "section": section, "title": title,
                      "refs": {g: r for g, r in refs.items() if r}})
    return units


def load_macula():
    """Yields dict rows for the four Gospels from the MACULA SBLGNT TSV."""
    with open(RAW / "macula-sblgnt.tsv", encoding="utf-8") as f:
        for row in csv.DictReader(f, delimiter="\t", quoting=csv.QUOTE_NONE):
            book = row["ref"][:3]
            if book not in MACULA_BOOK:
                continue
            m = re.match(r"\w+ (\d+):(\d+)!(\d+)", row["ref"])
            row["g"] = MACULA_BOOK[book]
            row["ch"], row["v"], row["w"] = map(int, m.groups())
            yield row
