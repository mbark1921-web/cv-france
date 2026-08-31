# CV France v20.2.1

Application de création de CV, lettres de motivation et suivi de candidatures.

## Production Render
Le dépôt contient `render.yaml` pour déployer le service Docker en production. L'hébergement reste configuré sur le plan gratuit (`plan: free`).

Configuration actuelle: `APP_STAGE=production`, `EMAIL_MODE=console`, `AI_MODE=mock`. Stripe reste optionnel tant que les variables correspondantes ne sont pas configurées.

## Sécurité
Ne jamais committer `.env`, clés API, secrets Stripe, mots de passe SMTP ou bases SQLite. `.gitignore` protège ces fichiers.

## Commandes
- `npm start`
- `npm run doctor`
- `npm run platform-check`
- `npm run test:smoke`
- `npm run backup`
