# Scripts

Place for fixture import helpers and data maintenance.

- **Fixture import:** Manual entry for MVP; add CSV/API import here later.
- **Data maintenance:** Backup, audit exports, etc.
- **Demo environment:** `npx tsx scripts/seed-demo-accounts.ts` creates review accounts (platform admin, organiser, players) and a "Demo Rovers" fundraiser with join code `DEMO26`. Re-running refreshes the account passwords. To reseed the fundraiser, sign in as the demo organiser and delete it from the danger zone first. Requires the Premier League seed.
