# Jovelya 20.7.0 — qualification du 7 septembre 2026

Verdict actuel : **NO-GO**. Les résultats locaux ne certifient pas la production.

## Référence et périmètre

Après `git fetch origin`, HEAD, origin/main et la référence GitHub main correspondent
à `fff4d59f28fe4427b23e4629b96dfa56bc4caaed`. Le workflow de référence
[34048013736](https://github.com/mbark1921-web/cv-france/actions/runs/34048013736)
est terminé avec succès. Les modifications locales préexistantes de documentation
et de qualification des builds ont été conservées. Aucun secret réel n'a été lu,
remplacé ou ajouté au dépôt, et aucune donnée de production n'a été modifiée.

Architecture examinée : Express et JWT applicatifs, adaptateur PostgreSQL avec
transactions AsyncLocalStorage, transformation du serveur historique vers les appels
asynchrones, interface HTML bilingue construite par une chaîne de patches, API de
courriel Brevo/SMTP, migrations et restauration réservées aux bases locales isolées.
Stripe et les appels IA externes sont désactivés par le build de lancement gratuit.

## Correctifs et vérifications

- Documentation : version 20.7.0, modes Brevo/IA, URL du service existant et avertissement
  explicite sur les sauvegardes éphémères. Le nom du service est conservé pour ne pas
  changer son identité ou son URL sans connaître le domaine définitif.
- Builds : qualification dans deux copies temporaires avec comparaison SHA-256 ;
  les fichiers générés ne modifient pas le checkout. Les patches d'événements CV et
  de style de marque ne doivent plus accumuler de doublons lors des répétitions.
- Courriel (gravité moyenne) : délai Brevo de 15 secondes couvrant aussi la lecture
  du corps ; délais SMTP explicites. Aucun renvoi automatique d'une requête ambiguë.
- Courriel (gravité élevée en cas de configuration production incorrecte) : le mode
  console refuse désormais l'envoi en production avant d'afficher un lien de jeton.
  Les erreurs Brevo ne recopient plus les détails renvoyés par le fournisseur.
- Installation verrouillée : `npm ci --include=dev --ignore-scripts` réussit.
  `npm audit --json` : zéro vulnérabilité signalée, toutes gravités confondues.
- Deux builds indépendants identiques ; syntaxe navigateur : 41 scripts dans
  10 fichiers publics ; tests ciblés : 2 d'idempotence et 3 de courriel réussis.
- `git diff --check` ne signale pas d'erreur d'espacement.

La qualification complète utilise Node 24, PostgreSQL 16 portable, OpenSSL et le
Chromium Playwright installé, avec des bases jetables et sans environnement de
production hérité. Résultat final sur le code du commit
`7a5f9fd362a68718a966671e0001c78b60cea3d3` : **RELEASE GATE PASSED**,
181 tests réussis, zéro échec, zéro test ignoré, durée des suites 466,2 secondes.
Environnement : Node 24.19.0, PostgreSQL 16.15, OpenSSL 3.5.7. Le commit suivant
ajoute uniquement ce rapport et ne modifie pas le code qualifié.

Premier passage complet : 181 tests, 170 réussis, 11 échoués, aucun ignoré.
Dix échecs proviennent du même hook de démarrage du serveur des comptes dépassant
10 secondes ; le onzième constate momentanément l'absence du label `appDate`.
Ces onze tests passent sur la relance hors sandbox sans changement de code.
La cause précise du comportement transitoire n'est pas établie ; il ne faut pas
présenter le premier passage comme réussi.

## Commits locaux et fichiers

- `abeab9eee1c8713d05409c49722d5ee6ae7dd234` — documentation 20.7.0.
- `acd675a1f12a0a88d96fec2d005f2c696eb48924` — qualification des builds et idempotence.
- `7a5f9fd362a68718a966671e0001c78b60cea3d3` — courriels et tests de non-régression.

Fichiers : `.env.example`, `.env.render.example`, `README.md`, `package.json`,
`server/build-check.js`, `server/ci.js`, `server/mailer.js`, `server/mailer.test.js`,
`server/patch-cv-preview-events.js`, `server/patch-idempotence.test.js`,
`server/patch-jovelya-brand-v20-7-0.js` et ce rapport.

## Production et limites restantes

Les sondes HTTPS GET `/`, `/api/health`, `/api/readiness` et `/api/startup` sur
`https://cv-france-staging.onrender.com` ont toutes expiré après 60 secondes.
Cela ne permet pas de confirmer la cause historique PostgreSQL `28P01` ni le SHA
réellement déployé. Le tableau de bord Render affiche sa page de connexion.

L'action externe immédiate est de se connecter à Render dans l'onglet ouvert.
Il faudra ensuite lire le déploiement et les logs, vérifier uniquement les noms
de variables et les parties non secrètes du point de connexion, et demander à
l'opérateur toute saisie ou correction d'un identifiant réel nécessaire.

Restent non certifiés : livraison Brevo réelle, persistance après redémarrage,
configuration et droits/RLS Supabase en ligne, sauvegardes externes durables et
restauration d'une copie de production dans une base jetable, domaine final et
coordonnées légales. Les exemples de domaine ne doivent pas être remplacés par
une identité légale ou un domaine inventé.

La CSP conserve `unsafe-inline` pour les scripts et gestionnaires historiques :
c'est une limite de défense contre les injections, pas une CSP stricte. Le schéma
local utilise les contrôles d'appartenance de l'API Express ; il ne prouve pas que
les tables Supabase sont inaccessibles aux rôles Data API. Le runbook de récupération
exige déjà cette vérification distincte. Aucun changement de RLS n'a été appliqué.

Les suites automatisées FR/AR ne remplacent pas une validation visuelle exhaustive
de tous les modèles de CV/PDF sur mobile et bureau, ni un parcours complet en ligne.
Ces validations restent nécessaires avant de déclarer le projet terminé.

## Checklist de lancement

1. Qualification locale complète verte sur le candidat, diff final vérifié et commits identifiés.
2. Poussée autorisée par ce résultat, puis Release gate GitHub vert sur le même SHA.
3. SHA Render identifié et quatre sondes publiques réussies.
4. Connexion PostgreSQL avec certificat et nom d'hôte vérifiés ; persistance et isolation confirmées.
5. Courriels de vérification et réinitialisation reçus ; parcours FR/AR et PDF validés.
6. Sauvegarde externe et restauration jetable vérifiées ; domaine et mentions légales finalisés.
