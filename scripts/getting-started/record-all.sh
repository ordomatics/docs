#!/usr/bin/env bash
# Records every scene in order, from an empty state (no project, no repository,
# the GitHub app not installed, no local clone). Stops at the first failure.
# Run detached:  setsid nohup ./record-all.sh > .auth/logs/all.log 2>&1 < /dev/null &
set -u
cd "$(dirname "$0")"
mkdir -p .auth/logs
# FROM=scene3-connect resumes there, keeping the clips already recorded.
started=${FROM:+no}
for scene in scene1-create scene2a-repository scene2b-clone scene3-connect scene4-local scene5-module \
             scene6-dev scene7-release scene8-live; do
    [ "${FROM:-}" = "$scene" ] && started=
    [ -n "$started" ] && continue
    echo "== $(date -u +%H:%M:%S) $scene"
    if ! node "$scene.mjs" > ".auth/logs/$scene.log" 2>&1; then
        echo "FAILED: $scene (see .auth/logs/$scene.log)"
        tail -12 ".auth/logs/$scene.log"
        exit 1
    fi
    tail -2 ".auth/logs/$scene.log"
done
echo "== $(date -u +%H:%M:%S) all scenes recorded"
