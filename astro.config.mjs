// @ts-check
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightBlog from "starlight-blog";

export default defineConfig({
  site: "https://docs.ordomatics.com",
  integrations: [
    starlight({
      title: {
        en: "Ordomatics Docs",
        fr: "Documentation Ordomatics",
      },
      description:
        "Documentation for Ordomatics — a full Odoo 18 ERP you run over WhatsApp.",
      // English is the default; French pages live under /fr/. A page with no
      // French translation falls back to English rather than 404ing.
      defaultLocale: "root",
      locales: {
        root: { label: "English", lang: "en" },
        fr: { label: "Français", lang: "fr" },
      },
      plugins: [
        starlightBlog({
          title: { en: "Blog", fr: "Blog" },
          postCount: 10,
          recentPostCount: 5,
        }),
      ],
      social: [
        {
          icon: "linkedin",
          label: "LinkedIn",
          href: "https://www.linkedin.com/company/ordomatiks",
        },
        {
          icon: "email",
          label: "Email",
          href: "mailto:salam@ordomatics.com",
        },
      ],
      editLink: {
        baseUrl: "https://github.com/ordomatics/docs/edit/main/",
      },
      sidebar: [
        {
          label: "Start here",
          translations: { fr: "Commencer" },
          items: [
            {
              label: "Getting Started",
              items: [
                { label: "Overview", slug: "start/getting-started" },
                { label: "1. Onboard a project", link: "/start/getting-started/#1-onboard-a-project" },
                { label: "2. Add a database", link: "/start/getting-started/#2-add-a-database" },
                { label: "3. Create an environment", link: "/start/getting-started/#3-create-an-environment" },
              ],
            },
            {
              label: "Development Workflow",
              items: [
                { label: "Overview", slug: "start/development-workflow" },
                { label: "1. Create your repository", link: "/start/development-workflow/#1-create-your-repository" },
                { label: "2. Connect GitHub", link: "/start/development-workflow/#2-connect-github" },
                { label: "3. Develop locally", link: "/start/development-workflow/#3-develop-locally" },
                { label: "4. Ship through CI/CD", link: "/start/development-workflow/#4-ship-through-cicd" },
                { label: "5. Point at staging", link: "/start/development-workflow/#5-point-at-staging" },
              ],
            },
            {
              label: "Advanced",
              translations: { fr: "Avancé" },
              items: [
                {
                  label: "Manage Deployment",
                  items: [
                    { label: "Overview", slug: "start/manage-deployment" },
                    { label: "1. Add a custom domain", link: "/start/manage-deployment/#1-add-a-custom-domain" },
                    { label: "2. Update deployment size", link: "/start/manage-deployment/#2-update-deployment-size" },
                    { label: "3. Pause or resume a deployment", link: "/start/manage-deployment/#3-pause-or-resume-a-deployment" },
                    { label: "4. Reset a database", link: "/start/manage-deployment/#4-reset-a-database" },
                  ],
                },
                { label: "Bring Your Own Postgres", slug: "start/byo-postgres" },
                { label: "Bring Your Own Cluster", slug: "start/byo-cluster" },
              ],
            },
          ],
        },
        {
          label: "Guides",
          translations: { fr: "Guides" },
          items: [{ autogenerate: { directory: "guides" } }],
        },
        {
          label: "Reference",
          translations: { fr: "Référence" },
          items: [{ autogenerate: { directory: "reference" } }],
        },
      ],
    }),
  ],
});
