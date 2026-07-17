# Last Man Standing

A reusable fundraising platform for Last Man Standing competitions. Payments happen outside the app;
administrators record and confirm them in the dashboard. The app provides a live member view, entrant
management, prize/fundraising totals, picks, results and an audit trail.

## Quick start

```bash
npm install
cp .env.example .env.local   # add your PostgreSQL connection
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Setup

### 1. Database

Set `PRISMA_DATABASE_URL` in `.env.local` and in Vercel. It must be a PostgreSQL connection string and
must never use a `NEXT_PUBLIC_` prefix.

Generate the client and create migrations locally:

```bash
set -a; source .env.local; set +a
npx prisma generate
npx prisma migrate dev --name initial_schema
```

The initial migration is committed in `prisma/migrations`. For a production deployment, run
`npm run prisma:deploy` with `PRISMA_DATABASE_URL` configured in that environment; do not use
`migrate dev` against production.

### 2. GitHub

Repo is already wired to `origin`:

```bash
git add .
git commit -m "Setup Next.js, Supabase, docs, infra"
git push -u origin main
```

(Push from your machine so you can authenticate with GitHub.)

### 3. Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. **Add New → Project** and import the `lastman` repo.
3. In **Settings → Environment Variables** add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. Vercel will run `next build` and host the app.
5. Add `PRISMA_DATABASE_URL` to Vercel. Run production migrations explicitly as part of deployment once the initial schema is approved.

## Docs

- **Spec:** [docs/mvp/rvr-lms-app-spec.md](docs/mvp/rvr-lms-app-spec.md) (full), [docs/SPEC.md](docs/SPEC.md) (summary)
- **Decisions:** [docs/DECISIONS.md](docs/DECISIONS.md)
- **Runbook:** [docs/RUNBOOK.md](docs/RUNBOOK.md)
- **Infra:** [infra/README.md](infra/README.md)

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run start` — run production build locally
- `npm run lint` — ESLint

## Tech

- **Next.js** (App Router), TypeScript, Tailwind
- **Prisma + PostgreSQL** — database access and migrations
- **Vercel** — Hosting
