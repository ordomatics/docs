#!/usr/bin/env bash
# Quick review of a recorded clip: duration and streams, a contact sheet of
# evenly spaced frames to look at, and (if it has audio) when speech starts,
# to compare against when each caption appears.
#   check-clip.sh clip.mp4 [frames=9] [out-dir=/tmp]
set -euo pipefail
clip="$1"
frames="${2:-9}"
out="${3:-/tmp}"
name="$(basename "${clip%.*}")"

duration="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$clip")"
streams="$(ffprobe -v error -show_entries stream=codec_type -of csv=p=0 "$clip" | tr '\n' ' ')"
echo "clip:     $clip"
echo "duration: ${duration} s   streams: ${streams}"

cols=3
rows=$(( (frames + cols - 1) / cols ))
sheet="$out/${name}-sheet.png"
ffmpeg -loglevel error -y -i "$clip" \
    -vf "fps=${frames}/${duration},scale=640:-2,tile=${cols}x${rows}" -frames:v 1 "$sheet"
echo "sheet:    $sheet   (open it and look: cursor, captions, highlights, no private data)"

if [[ "$streams" == *audio* ]]; then
    starts="$(ffmpeg -hide_banner -i "$clip" -af "silencedetect=noise=-40dB:d=0.6" -f null - 2>&1 \
        | grep -oE "silence_(start|end): [0-9.]+" | awk '{print $2}' | paste - - \
        | awk 'BEGIN{p=0}{if($1>p+0.05) printf "%.1f ", p; p=$2} END{print ""}')"
    echo "speech starts (s): ${starts}"
    echo "  → grab a frame at each start to confirm the matching caption is on screen:"
    echo "    ffmpeg -ss <t> -i \"$clip\" -frames:v 1 -vf \"crop=iw:120:0:ih-120\" /tmp/cap-<t>.png"
fi
