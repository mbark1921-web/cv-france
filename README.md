# CV France v20

Application de création de CV, lettres de motivation et suivi de candidatures.

## Staging Render
Le dépôt contient `render.yaml` pour créer un service Docker avec disque persistant `/data`.

Ordre conseillé: déployer d'abord avec `EMAIL_MODE=console`, `AI_MODE=mock`, Stripe désactivé, puis tester `/api/health` et `/api/readiness`.

## Sécurité
Ne jamais committer `.env`, clés API, secrets Stripe, mots de passe SMTP ou bases SQLite. `.gitignore` protège ces fichiers.

## Commandes
- `npm start`
- `npm run doctor`
- `npm run platform-check`
- `npm run test:smoke`
- `npm run backup`
