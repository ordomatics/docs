#!/usr/bin/env bash
# Returns this machine to the demo's starting point: no minikube, no cluster, no leftovers.
set -u
command -v minikube >/dev/null && minikube delete --all >/dev/null 2>&1
rm -f ~/.local/bin/minikube "$(dirname "$0")"/.auth/work/minikube-linux-amd64 "$(dirname "$0")"/.auth/*.txt
echo "reset: $(command -v minikube || echo no minikube)"
