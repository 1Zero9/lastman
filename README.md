# Last Man Standing — RVR

Invite-only Last Man Standing fundraising app for River Valley Rangers. Next.js + Supabase, deployable on Vercel.

## Quick start

```bash
npm install
cp .env.example .env.local   # add your Supabase keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **Project Settings → API** copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. In **Authentication → URL Configuration** set:
   - Site URL: `http://localhost:3000` (dev) or your Vercel URL (prod)
   - Redirect URLs: add your app URLs for magic link callback
4. Enable **Email** (and optionally **Phone**) under Authentication → Providers for magic link / SMS.

Put the values in `.env.local` (see `.env.example`).

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
5. In Supabase, set **Site URL** and **Redirect URLs** to your Vercel URL (e.g. `https://lastman-xxx.vercel.app`) so magic links work in production.

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
- **Supabase** — Auth (magic link / SMS), DB (to be added)
- **Vercel** — Hosting
