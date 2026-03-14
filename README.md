# QuoteForge 🔨

Plateforme SaaS de génération et gestion de devis pour entreprises B2B.

## Stack

- **Frontend:** Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + shadcn/ui
- **Backend:** tRPC + Drizzle ORM + Neon Postgres (serverless)
- **Auth:** Better Auth (email/password + organizations)
- **Email:** Resend
- **PDF:** Puppeteer
- **Deploy:** Vercel

## Prérequis

- Node.js 20+
- npm ou pnpm
- PostgreSQL (Neon recommandé)
- Compte Resend (pour les emails)

## Installation

```bash
# Cloner le repo
git clone https://github.com/croissantlabs/quote-forge.git
cd quote-forge

# Installer les dépendances
npm install

# Copier les variables d'environnement
cp .env.example .env.local
```

## Configuration

Éditer `.env.local` avec vos valeurs :

```env
# Database (Neon Postgres)
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require

# Better Auth
BETTER_AUTH_SECRET=<générer avec: openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx

# Cron Jobs
CRON_SECRET=<générer avec: openssl rand -base64 32>
```

## Base de données

```bash
# Générer les migrations depuis le schéma
npm run db:generate

# Appliquer les migrations
npm run db:migrate

# Seed des données de test
npm run db:seed

# (Optionnel) Ouvrir Drizzle Studio pour visualiser la DB
npm run db:studio
```

## Lancement

```bash
# Mode développement
npm run dev

# Build production
npm run build

# Lancer en production
npm start
```

L'app est accessible sur [http://localhost:3000](http://localhost:3000).

## Compte de test (après seed)

```
Email:    simon@croissantlabs.fr
Password: password123
Org:      CroissantLabs
```

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build production |
| `npm run db:generate` | Générer migrations Drizzle |
| `npm run db:migrate` | Appliquer migrations |
| `npm run db:push` | Push schema direct (dev) |
| `npm run db:seed` | Peupler avec données de test |
| `npm run db:studio` | Interface Drizzle Studio |
| `npm run lint` | ESLint |

## Structure du projet

```
src/
├── app/
│   ├── (auth)/          # Pages auth (login, signup)
│   ├── (dashboard)/     # Pages dashboard (protégées)
│   ├── api/             # API routes (tRPC, auth, cron, PDF)
│   └── q/[token]/       # Page publique devis (client)
├── components/
│   ├── layout/          # Providers (tRPC, etc.)
│   ├── quotes/          # Composants devis
│   └── ui/              # Composants shadcn/ui
├── db/
│   ├── schema.ts        # Schéma Drizzle
│   ├── index.ts         # Connexion DB
│   └── seed.ts          # Données de test
├── lib/
│   ├── email/           # Templates et envoi emails
│   ├── pdf/             # Génération PDF (Puppeteer)
│   ├── auth-client.ts   # Client Better Auth
│   └── trpc-client.ts   # Client tRPC
└── server/
    ├── api/
    │   ├── routers/     # Routers tRPC
    │   ├── context.ts   # Context tRPC (session, org)
    │   └── trpc.ts      # Config tRPC (middleware)
    └── auth/
        └── index.ts     # Config Better Auth
```

## Déploiement

Le projet est déployé sur Vercel :

```bash
# Deploy preview
vercel

# Deploy production
vercel --prod
```

Variables d'environnement requises sur Vercel :
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` (URL de production)
- `NEXT_PUBLIC_APP_URL` (URL de production)
- `RESEND_API_KEY`
- `CRON_SECRET`

## Cron Jobs

Vercel Cron exécute `/api/cron/payment-reminders` tous les jours à 9h00 pour envoyer les rappels de paiement automatiques.

## Architecture

- **Multi-tenant** via `organizationId` sur toutes les tables
- **Auth** : Better Auth avec plugin organization
- **API** : tRPC avec rate limiting + error sanitization en prod
- **PDF** : 3 templates (classic, modern, minimal) avec couleurs custom
- **Email** : Resend avec template HTML responsive
- **Sécurité** : CSP, X-Frame-Options, HSTS, XSS protection, rate limiting
