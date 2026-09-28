#!/usr/bin/env bash
# Records every tutorial clip in order (TUTO_LANG=en for the English set).
set -euo pipefail
cd "$(dirname "$0")"
node part0-compte.mjs creer-un-compte recharger
node part1-decouvrir.mjs dossiers-et-documents
node part2-voix.mjs
node part3-ia.mjs regenerer copilot message-vocal gendarmerie
node part4-importer.mjs
node part5-apercu.mjs
node part6-scenario.mjs
node part7-affiliation.mjs
