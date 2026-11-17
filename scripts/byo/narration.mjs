// What is shown (the caption) and what is said (the narration), per scene.
export const SAY = {
    // Scene 1
    "Install minikube": "Any Kubernetes cluster works. For this demo we use minikube, on this laptop. Download it, and put it on your path.",
    "Start a cluster": "Start a cluster. Minikube runs it in Docker, and gives it eight gigabytes of memory.",
    "Is it ready to be connected?": "Check what the connect command will check: a recent Kubernetes version, a default storage class, and no other ingress controller.",
    // Scene 2
    "Your infrastructure": "In the portal, open your infrastructure.",
    "Add the cluster": "Give the cluster a name, and connect it. Its page shows the one command to run.",
    // Scene 3
    "Run the connect command": "Run that command where kubectl reaches your cluster. It names the cluster it found, and asks before it changes anything.",
    "It installs our connector": "It checks the cluster, installs a small connector that dials out to us, and prints a token. No port is opened on your side.",
    // Scene 4
    "Paste the token": "Paste that token in the portal, and connect.",
    "Connected": "The cluster is connected. We install the ingress controller on it, and the platform can now deploy there.",
    // Scene 5
    "Add an environment on your cluster": "Now run an application on it. Open your project, and add an environment on your own database server.",
    "Choose your cluster and your database": "Choose your cluster, and give the details of your database. Here, a Postgres running on the same cluster. We check it from inside your cluster before building anything.",
    "The platform deploys it": "The platform deploys Odoo on your cluster. It takes a few minutes.",
    "Your Odoo, on your cluster": "And here it is, at its own address, served from your cluster through the tunnel.",
};

export const INTRO = "Run your project on your own Kubernetes cluster: prepare a cluster, connect it to the platform, and deploy an environment on it.";
export const OUTRO = "Next: back up your database, and add your own domain.";
