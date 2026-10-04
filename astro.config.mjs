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
      // Editor tutorial pages: social preview image, share bar at the bottom and
      // in the desktop "On this page" column.
      components: {
        Head: "./src/components/overrides/Head.astro",
        Footer: "./src/components/overrides/Footer.astro",
        TableOfContents: "./src/components/overrides/TableOfContents.astro",
      },
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
                { label: "1. Create a project", link: "/start/getting-started/#1-create-a-project" },
                { label: "2. Connect GitHub", link: "/start/getting-started/#2-connect-github" },
                { label: "3. Develop locally", link: "/start/getting-started/#3-develop-locally" },
                { label: "4. Push to dev", link: "/start/getting-started/#4-push-to-dev" },
                { label: "5. Merge to main", link: "/start/getting-started/#5-merge-to-main" },
                { label: "6. Watch the logs and upgrade states", link: "/start/getting-started/#6-watch-the-logs-and-upgrade-states" },
              ],
            },
            {
              label: "Manage your project",
              items: [{ label: "Overview", slug: "start/manage-your-project" }],
            },
            {
              label: "Advanced",
              translations: { fr: "Avancé" },
              items: [
                { label: "Bring Your Own Postgres", slug: "start/byo-postgres" },
                { label: "Bring Your Own Cluster", slug: "start/byo-cluster" },
              ],
            },
          ],
        },
        {
          label: "Smartacus editor",
          translations: { fr: "Éditeur Smartacus" },
          items: [{ autogenerate: { directory: "editeur" } }],
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
