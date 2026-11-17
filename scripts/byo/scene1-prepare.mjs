// Scene 1: install minikube and start a cluster, then the checks the connect command repeats.
import { AUTH, WORK, command, openFolder, openTerminal, run, sh, startVscode, until } from "./common.mjs";
import { SAY } from "./narration.mjs";
import { caption, pause, startClip } from "../getting-started/tuto.mjs";

if (sh("command -v minikube || true", { cwd: WORK }).trim()) {
    throw new Error("minikube is already installed: run ./reset.sh before re-recording this scene");
}
sh("mkdir -p ~/.local/bin", { cwd: WORK });
await startVscode({ fresh: true });

const { page, finish, fastForward } = await startClip("1-prepare", { storageState: AUTH, voiceOver: { say: SAY } });
fastForward(12);
await openFolder(page, WORK);
await openTerminal(page, { maximized: true });
fastForward();
await pause(page, 600);

await caption(page, "Install minikube");
await run(page, "curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64", { after: 500 });
fastForward(30);                      // 136 MB: minutes on a slow line
await until(() => sh("test -s minikube-linux-amd64 && ! pgrep -x curl && echo done", { cwd: WORK, allowFail: true }).includes("done"),
    { timeout: 30 * 60 * 1000, every: 2000, what: "the minikube download" });
fastForward();
await pause(page, 1200);
await run(page, "install -m 755 minikube-linux-amd64 ~/.local/bin/minikube");
await run(page, "minikube version", { after: 1800 });

await caption(page, "Start a cluster");
await run(page, "minikube start --driver=docker --memory=8g --cpus=4", { after: 2000 });
fastForward(30);                      // image pull and boot: minutes
await until(() => sh("kubectl get nodes --no-headers 2>/dev/null | grep -w Ready || true", { cwd: WORK }).trim(),
    { timeout: 60 * 60 * 1000, every: 5000, what: "a Ready node" });
fastForward();
await pause(page, 2000);

await caption(page, "Is it ready to be connected?");
await run(page, "clear", { after: 300 });
for (const check of ["kubectl config current-context", "kubectl version", "kubectl get storageclass", "kubectl get ingressclass"]) {
    await run(page, check, { after: 2200 });
}
await pause(page, 1500);
await caption(page, null, 400);
console.log(sh("kubectl get nodes", { cwd: WORK }));
await finish();
