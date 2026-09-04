---
title: Formules
description: Comment les déploiements Ordomatics sont isolés.
---

Toutes les formules exécutent le même Odoo 18. Ce qui change, c'est la part
d'infrastructure qui vous est réservée.

| Formule | Déploiement | Base de données | Cluster |
|---|---|---|---|
| **Attachée** | Partagé | Partagée, isolée par client | Partagé |
| **Dédiée** | Le vôtre | La vôtre | Partagé |
| **Isolée** | Le vôtre | La vôtre | Le vôtre |

Vous pouvez changer de formule sans migration : c'est le même système, donc rien à
réimporter et personne à reformer.

## Facturation

Crédits prépayés. Vous rechargez et consommez selon l'usage réel — sans licence par
utilisateur ni engagement annuel.
