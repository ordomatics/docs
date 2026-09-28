#!/usr/bin/env bash
# Social preview image (1200x630, the Open Graph size) for every tutorial clip:
# a frame near the end, where the result is on screen, letterboxed on the site's
# background with a play button. Writes <clip dir>/og/<clip>.jpg; skips existing
# ones unless --force.
set -euo pipefail
cd "$(dirname "$0")/../../public/editeur"
force="${1:-}"
play=/tmp/tuto-play.png
convert -size 160x160 xc:none -fill "rgba(17,24,39,0.78)" -draw "circle 80,80 80,4" \
    -fill white -draw "polygon 64,48 64,112 116,80" "$play"
for clip in *.mp4 en/*.mp4; do
    dir="$(dirname "$clip")/og"
    out="$dir/$(basename "${clip%.mp4}").jpg"
    [[ -f "$out" && "$force" != "--force" ]] && continue
    mkdir -p "$dir"
    d="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$clip")"
    t="$(echo "$d - 1.5" | bc)"
    ffmpeg -loglevel error -y -ss "$t" -i "$clip" -i "$play" -frames:v 1 -filter_complex \
        "[0:v]scale=-2:590,pad=1200:630:(ow-iw)/2:(oh-ih)/2:color=#e6f0ff[bg];[bg][1:v]overlay=(W-w)/2:(H-h)/2" \
        -q:v 4 "$out"
    echo "$out"
done
