"""Cuts the stretches of a clip where the picture is frozen and nothing is said (a fast-forwarded wait),
keeping a couple of seconds of each. Usage: trim-dead-air.py clip.mp4 [more.mp4 ...]"""
import re, subprocess, sys

def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True).stderr

def intervals(clip, kind, duration):
    if kind == "freeze":
        out = run(["ffmpeg", "-hide_banner", "-i", clip, "-vf", "freezedetect=n=-50dB:d=4", "-an", "-f", "null", "-"])
        starts = [float(x) for x in re.findall(r"freeze_start: ([\d.]+)", out)]
        ends = [float(x) for x in re.findall(r"freeze_end: ([\d.]+)", out)]
    else:
        out = run(["ffmpeg", "-hide_banner", "-i", clip, "-af", "silencedetect=noise=-40dB:d=4", "-f", "null", "-"])
        starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]
        ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    ends += [duration] * (len(starts) - len(ends))
    return list(zip(starts, ends))

for clip in sys.argv[1:]:
    duration = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", clip],
                                    capture_output=True, text=True).stdout)
    frozen, silent = intervals(clip, "freeze", duration), intervals(clip, "silence", duration)
    cuts = []
    for fa, fb in frozen:
        for sa, sb in silent:
            a, b = max(fa, sa), min(fb, sb)
            if b - a > 4.5:
                cuts.append((a + 1.5, b - 1.0))
    if not cuts:
        print(f"{clip}: nothing to cut")
        continue
    expr = "+".join(f"between(t,{a:.2f},{b:.2f})" for a, b in cuts)
    keep = f"not({expr})"
    tmp = clip + ".trim.mp4"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", clip, "-filter_complex",
                    f"[0:v]select='{keep}',setpts=N/FRAME_RATE/TB[v];[0:a]aselect='{keep}',asetpts=N/SR/TB[a]",
                    "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "medium", "-crf", "28", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", tmp], check=True)
    new = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", tmp],
                               capture_output=True, text=True).stdout)
    subprocess.run(["mv", tmp, clip], check=True)
    print(f"{clip}: {duration:.1f}s -> {new:.1f}s, cut {', '.join(f'{a:.0f}-{b:.0f}s' for a, b in cuts)}")
