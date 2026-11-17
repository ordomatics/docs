#!/usr/bin/env bash
# Records the demo from nothing, in order. Needs TUTO_PG_PASSWORD (see scene5-deploy.mjs).
# Run detached:  setsid nohup ./record-all.sh > .auth/all.log 2>&1 < /dev/null &
set -u
cd "$(dirname "$0")"
[ -n "${FROM:-}" ] || ./reset.sh
started=${FROM:+no}
for scene in scene1-prepare scene2-add scene3-connect scene4-token scene5-deploy; do
    [ "${FROM:-}" = "$scene" ] && started=
    [ -n "$started" ] && continue
    echo "== $(date -u +%H:%M:%S) $scene"
    if ! node "$scene.mjs" > ".auth/$scene.log" 2>&1; then
        echo "FAILED: $scene (see .auth/$scene.log)"; tail -12 ".auth/$scene.log"; exit 1
    fi
    tail -2 ".auth/$scene.log"
done
echo "== $(date -u +%H:%M:%S) all scenes recorded"
