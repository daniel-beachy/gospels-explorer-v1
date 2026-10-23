# Gospels Explorer

**Live site: https://daniel-beachy.github.io/gospels-explorer-v1/**

See the four Gospels the way someone reading the Greek does: where Matthew and Luke copy Mark word for word, where they change him, what only one Gospel tells, and how differently John tells the story. You don't need to know any Greek.

- **Map**: all four Gospels drawn to scale, with ribbons linking every parallel passage and numbered discoveries to start from.
- **Synopsis**: 228 parallel passages side by side, aligned word by word with an English gloss under each Greek word. Minor agreements are outlined, and an optional "theory lens" shows how the Two-Source, Farrer and Griesbach hypotheses would read each passage.
- **Reader**: each Gospel straight through, with an interlinear toggle, signature-word highlighting and manuscript variants (modern critical text vs. the KJV's Textus Receptus).
- **Fingerprints**: the words each author over-uses, measured statistically.
- **Variants**: the textual variants that matter, and why.

## What to trust

Every element is labeled as one of three kinds:

| Label | Meaning |
|---|---|
| **Data** | Computed by the build scripts directly from the Greek text (alignment, colors, statistics). |
| **Scholarship** | Standard summaries of mainstream scholarship (source theories, textual variants). |
| **AI** | Interpretation written by Claude Opus 5.5. Every quoted Greek word is machine-checked against the text at build time. |

## Sources

- Greek: SBL Greek New Testament, with morphology, glosses and Louw–Nida domains from [MACULA Greek](https://github.com/Clear-Bible/macula-greek) (CC BY 4.0)
- Variants: [STEPBible TAGNT](https://github.com/STEPBible/STEPBible-Data), Tyndale House (CC BY 4.0). Only derived data is published here.
- English: [Berean Standard Bible](https://berean.bible) (public domain)

## Run locally

```bash
npm install
npm run dev
```

The processed data in `public/data` is committed. To rebuild it from the sources:

```bash
scripts/fetch_data.sh                 # downloads into data/raw (gitignored)
python3 scripts/check_pericopes.py    # validates the parallel table
python3 scripts/build_data.py         # alignment, statistics, variants -> public/data
python3 scripts/build_notes.py        # compiles data/ai into public/data/notes.json, verifying every Greek citation
```

`data/pericopes.txt` is the hand-built table of parallel passages; `data/ai/` holds the AI-written notes, deep readings and discoveries.
