# Infra & deployment

## Environment variables

Copy `.env.example` to `.env.local` and fill in values.

- **PostgreSQL / Prisma:** Set `PRISMA_DATABASE_URL` to the server-only PostgreSQL connection string.
  It must not use a `NEXT_PUBLIC_` prefix.

## Vercel

1. Push this repo to GitHub.
2. In [Vercel](https://vercel.com): Import the GitHub repo.
3. Add the same env vars in Vercel: Project → Settings → Environment Variables.
4. Deploy. Vercel will build `next build` and deploy.

## Database migrations

- Create migrations locally with `npm run prisma:migrate -- --name descriptive_name`.
- Apply committed migrations to production with `npm run prisma:deploy`.
- Keep the database URL server-only; never expose it to browser code.
