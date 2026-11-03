---
title: Formules
description: "Business, Developer et Partner : ce que chaque formule inclut et son prix."
---

Toutes les formules exécutent le même Odoo 18. Ce qui change, c'est la part
d'infrastructure et de code qui vous est réservée. Vous pouvez changer de formule sans
migration : c'est le même système, donc rien à réimporter et personne à reformer.

| | Business | Developer | Partner |
|---|---|---|---|
| **Prix** | 0 €, plus crédits d'usage | 49 € par mois par déploiement | 3950 € par an, ou 395 € par mois |
| **Utilisateurs** | 1 par entreprise | Illimités | Illimités |
| **Base de données** | Partagée, isolée par entreprise | Dédiée | Votre propre Postgres |
| **Application et mises à jour** | Partagées, les mises à jour vous arrivent seules | Votre application | Vos applications |
| **Personnalisation** | Aucune | Vos modules et votre Dockerfile | Vos modules et votre Dockerfile |
| **Applications** | | Une par abonnement | Illimitées |
| **Cluster** | Partagé | Partagé | Votre propre cluster Kubernetes |
| **Code et images** | | Un dépôt GitHub | Votre propre GitHub, et votre propre GitLab pour les images |

## Business

Votre entreprise sur notre Odoo partagé, sans rien à gérer. Smartacus Pro, une caisse,
WhatsApp, un assistant IA, les appels et les SMS sont inclus. Vous payez ce que vous
utilisez avec des crédits prépayés : vous rechargez et consommez selon l'usage réel,
sans engagement annuel.

## Developer

Pour les développeurs qui construisent leurs propres modules. Une **application**, c'est
votre dépôt, votre Dockerfile, un environnement de test et un site en production. Chaque
déploiement coûte 49 € par mois.

Vous avez une base de données dédiée, un dépôt GitHub dédié pour vos modules, du CI/CD
(poussez sur `dev` pour tester, fusionnez sur `main` pour publier), des environnements de
test, et la possibilité d'apporter votre propre base de données.

Chaque base client a des utilisateurs illimités. L'exception est Odoo Enterprise : si vous
utilisez des modules Enterprise, la licence d'Odoo s'applique.

## Partner

**Votre infrastructure, notre orchestration.** Tout Developer, pour les équipes qui
déploient Odoo chez leurs clients. Vous apportez les éléments :

- **Votre code** : sur votre propre GitHub.
- **Vos images** : construites dans votre propre registre GitLab.
- **Votre cluster Kubernetes** : Linode, AWS, Azure, Google Cloud, DigitalOcean, ou même
  un ordinateur portable.
- **Votre Postgres** : Neon, Supabase, une base cloud ou une base locale.

Nous apportons l'orchestration qui mène votre Odoo du développement à la production :
builds, environnements de test, mises en production, mises à jour et arrivée des clients.
Votre code, vos images, vos serveurs et vos données restent à vous ; nous ne
faisons qu'orchestrer.

Vous maîtrisez vos coûts d'infrastructure, car vous payez directement vos fournisseurs,
et vous déployez autant d'applications Odoo que vous voulez, pour autant de clients que
vous voulez. Un jour par semaine de support d'infrastructure sur mesure et les migrations
de plateforme sont inclus.

Partner coûte **3950 € par an**, notre meilleur prix, ou 395 € par mois.

## Facturation

Business est facturé en crédits prépayés. Developer est un abonnement par déploiement.
Partner est un abonnement annuel ou mensuel.
