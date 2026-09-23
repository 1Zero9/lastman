# Scripts

Place for fixture import helpers and data maintenance.

- **Fixture import:** Manual entry for MVP; add CSV/API import here later.
- **Data maintenance:** Backup, audit exports, etc.
- **Seed demo environment:** `npx tsx scripts/seed-demo-accounts.ts` creates local review accounts and a "Demo Rovers" fundraiser. It requires a non-committed `DEMO_SEED_PASSWORD` of at least 16 characters. Do not use those seeded accounts for a live presentation.
- **Private showcase account:** after adding a concealed `SHOWCASE_PASSWORD` field to the Last Man Standing 1Password item, run `node ../Project-OS/kit/assets/1password-project-secrets/run-with-secrets.mjs lastman -- npx tsx scripts/provision-showcase-account.ts`. It creates only `showcase@lastman.demo`, a read-only viewer of the synthetic demo competition.
- **Legacy demo safety:** `npx tsx scripts/disable-legacy-demo-accounts.ts` disables the old seeded credentials whose password was previously committed to source. It preserves the synthetic competition data.
