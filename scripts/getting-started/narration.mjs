// What is shown (the caption) and what is said (the narration), per scene.
// The caption is short and names what is on screen; the voice explains why.
export const SAY = {
    // Scene 1
    "Create a project": "A project is your own Odoo: its database, its files and its address. Let's create one.",
    "The platform builds it for you": "The platform now builds everything: a code repository, file storage, the database and the servers. It takes a few minutes.",
    "Your project is ready": "The project is ready, and already online at its own address.",
    // Scene 2
    "Create your repository from the template": "Your code lives in your own GitHub repository, created from our template.",
    "Private, without the other branches": "Make it private, and leave the template's other branches out.",
    "Clone it and create the dev branch": "Clone it, then create the dev branch. You work on dev. Main is what production runs.",
    // Scene 3
    "Connect GitHub": "Back in the portal, connect GitHub, and give the Ordomatics app access to this repository only.",
    "Pick your repository and click Use": "Then pick the repository, and click Use.",
    "The platform sets up your pipeline": "The platform writes everything the build pipeline needs into your repository. You set none of it by hand.",
    // Scene 4
    "Set up your local environment": "To run it locally, copy the example environment file, and set the project name, the database name and the Odoo version.",
    "Start the stack": "Then start the stack with Docker Compose. The first start installs every module, and takes a few minutes.",
    "Odoo, on your machine": "This is the same image production runs, on your machine.",
    // Scene 5
    "Write your module in addons/": "Modules go in the addons folder. Ours builds on the document management module, and adds a filing reference to every document.",
    "List it in modules.cfg": "Then list it in the modules file. That is what gets a module installed, here and in production.",
    "Restart to install it": "Restart Odoo to install it.",
    "The new field, locally": "And here is the new Reference field, in the Documents app.",
    // Scene 6
    "Commit and push to dev": "Commit the new module, and push it to the dev branch.",
    "CI builds and tests your image": "Every push to dev builds your image, and tests that Odoo starts with it.",
    // Scene 7
    "Fast-forward main to dev": "To release, fast-forward main to dev, and push.",
    "Released without rebuilding": "Production gets exactly the image that dev tested. Nothing is rebuilt.",
    "Up to date": "The portal shows the release, and then: up to date.",
    // Scene 8
    "Your logs, in the portal": "The portal also shows your logs: the web server, background jobs, and live updates.",
    "Sign in, then change the default password": "Sign in to your site with the default administrator login, and change that password right away.",
    "Your module, live": "And here is the module, live in production.",
};

export const INTRO = "From nothing to your own Odoo module in production: create a project, connect GitHub, develop locally, and release.";
export const OUTRO = "Next: add environments, databases, and your own domain.";
