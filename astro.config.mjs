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
            { label: "Introduction", slug: "start/introduction" },
            { label: "Onboarding", slug: "start/onboarding" },
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
