# QuoteForge — Génération de devis B2B SaaS

## 🌍 Environnements

| Environnement | Branche | URL | Description |
|---------------|---------|-----|-------------|
| **Production** | `main` | https://quote-forge-seven.vercel.app | App live pour les clients |
| **Staging** | `staging` | https://quote-forge-staging.vercel.app | QA et validation avant prod |
| **Preview** | `feature/*` | Auto-généré par Vercel | Preview par PR |

## 🔄 Workflow de développement

```
feature/xyz → PR → merge dans staging → QA (Sacha) → merge dans main → Prod
```

### Étapes détaillées

1. **Développement** : Dev travaille sur une branche `feature/xxx`
2. **PR vers staging** : `gh pr create --base staging`
3. **Code Review** : Aaron review et merge
4. **QA** : Sacha teste sur https://quote-forge-staging.vercel.app
5. **Promotion Prod** : Aaron merge staging → main
6. **Déploiement auto** : Vercel déploie main → production

## 🚀 Commandes utiles

```bash
# Déployer staging manuellement
vercel deploy

# Déployer en production
vercel deploy --prod

# Créer une PR vers staging
gh pr create --base staging --title "feat: ..." --body "..."

# Merger staging → main (après QA)
git checkout main
git merge staging
git push origin main
```

## 🔧 Variables d'environnement

Les variables doivent être configurées dans Vercel Dashboard pour les deux environnements :
- `DATABASE_URL` — Neon PostgreSQL
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `RESEND_API_KEY` — **manquant en prod**
- `CRON_SECRET`

## 📋 Labels GitHub

- `tech` — Issue technique (assignée par Aaron)
- `business` — Issue business (assignée par Moïse)
- `qa` — En attente de QA par Sacha
- `blocked` — Bloquée (dépendance externe)

## 👥 Équipe

| Rôle | Agent | Responsabilités |
|------|-------|-----------------|
| CTO | Aaron | Architecture, code review, assignations |
| Dev Senior | David | Features complexes (auth, dashboard, PDF) |
| Dev Junior | Simon | CRUD, UI, templates |
| QA | Sacha | Tests, validation, bugs |
