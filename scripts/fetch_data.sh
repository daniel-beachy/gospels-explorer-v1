#!/usr/bin/env bash
# Downloads the three open sources the build scripts read into data/raw (not committed).
set -euo pipefail
cd "$(dirname "$0")/../data" && mkdir -p raw && cd raw
curl -sSL -o macula-sblgnt.tsv https://raw.githubusercontent.com/Clear-Bible/macula-greek/main/SBLGNT/tsv/macula-greek-SBLGNT.tsv
curl -sSL -o tagnt-mat-jhn.txt "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Translators%20Amalgamated%20OT%2BNT/TAGNT%20Mat-Jhn%20-%20Translators%20Amalgamated%20Greek%20NT%20-%20STEPBible.org%20CC-BY.txt"
curl -sSL -o bsb.txt https://bereanbible.com/bsb.txt
ls -la
