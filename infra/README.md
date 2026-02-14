# Infra & deployment

## Environment variables

Copy `.env.example` to `.env.local` and fill in values.

- **Supabase:** Create a project at [supabase.com](https://supabase.com). In Project Settings → API you get:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Optionally `SUPABASE_SERVICE_ROLE_KEY` for server-only admin operations (keep secret).

## Vercel

1. Push this repo to GitHub.
2. In [Vercel](https://vercel.com): Import the GitHub repo.
3. Add the same env vars in Vercel: Project → Settings → Environment Variables.
4. Deploy. Vercel will build `next build` and deploy.

## Supabase auth (magic link)

- In Supabase Dashboard: Authentication → Providers → Email (and optionally Phone for SMS).
- Enable "Confirm email" off for magic link if you want one-click sign-in.
- Set Site URL to your Vercel URL (e.g. `https://lastman.vercel.app`) and add redirect URLs under Authentication → URL Configuration.
