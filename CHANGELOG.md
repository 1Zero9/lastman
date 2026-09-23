# Changelog

## 0.4.8 — 2026-09-23

**Forgot password**
- Added a real self-service password reset for players and organisers: "Forgot your password?" on sign-in
  leads to `/forgot-password`, which emails a one-hour, one-time link via Resend. Always shows the same
  generic confirmation whether or not the email has an account, so the flow can't be used to check who's
  registered. Previously the only recovery path was a platform admin manually resetting someone's password
  by hand in `/platform`.

## 0.4.7 — 2026-09-23

**Branding**
- Fixed the browser favicon, which was still the default Next.js placeholder icon — rebuilt from the real
  Last Man Standing logo. Homepage never received the "Matchday Energy" dark theme rollout from 0.4.0 —
  now matches the full-bleed panel identity used on every other page.

**Competition setup codes**
- Replaced the single shared `ORGANISER_ACCESS_CODE` (one code, forever, for anyone) with per-competition
  one-time codes. A platform admin generates a code in `/platform` (with an optional label), hands it to
  the organiser, and it's consumed exactly once when `/admin/setup` creates that specific competition —
  visible nowhere except the platform admin panel.
- Account registration (`/get-started`) no longer needs a code at all; the code is required at the point
  a competition is actually created instead.
- Found and fixed a real gap this surfaced: no account held the `PLATFORM_ADMIN` role in production, so
  `/platform` was unreachable by anyone at all, including the founder's own account.

## 0.4.0 — 2026-09-22

**Player experience — "Matchday Energy" theme**
- Full dark stadium visual identity across every player-facing and public page: sign-in, rules, guide,
  join, account, my-entries, fixtures, standings, the bottom dock and mobile nav menu. Admin stays
  light/functional — deliberately not reskinned.
- Club branding (logo, colour, name) is isolated to a bordered badge with a coloured accent stripe
  rather than tinting whole pages/popups — a bad or clashing club colour can no longer break page
  readability. Applies to the join-page hero and the `ClubWelcome` popup.
- Scoreboard-style round/still-standing header, a live "make your picks" countdown banner (gated on
  whether the viewer actually still needs to pick), and a redesigned match picker showing exactly why
  a team is blocked — already used (with the round & date it was used) vs. blocked by the restricted
  top-group rule — as two visually distinct states.
- New streak leaderboard (`/leaderboard`, `/c/[slug]/leaderboard`), ranking entries by consecutive
  rounds survived this season.
- New club branding settings page (`/admin/branding`) — club name, website, colour, logo (URL-based),
  and an "about this fundraiser" description are now editable after setup, not just at creation.

**Notifications**
- Pick-deadline reminder emails via Resend, sent from `lastman@1zero9.com`. New hourly cron
  (`/api/cron/send-pick-reminders`) alongside the existing lock cron; emails an entry once per gameweek
  when it still has no pick and the deadline is within 24h. Branded with the real club logo/colour.

**Correctness fixes (found via a live 3-competition stress test)**
- Voiding a round no longer permanently burns the picked team or the restricted-group allowance —
  `eligibleTeamIds` now excludes VOID-outcome picks, matching what "Void round" always claimed to do.
- `wipeout.splitPrizeAtOrBelowEntries` is now actually read from season rules instead of a hardcoded `5`.
- A full-round wipeout is no longer silent: admin sees what happened right after settling; players see
  a banner on `/my-entries` when the last settled round wiped everyone out.
- A lone surviving entry that wins its final pick now correctly closes out the season (`WINNER` status
  was previously only ever set inside the wipeout branch — a normal, non-wipeout finish never completed
  the season).
- Settling a round before every fixture has a score now shows a clear validation message instead of a
  raw error page; the settle button is hidden until every fixture is scored.
- Rejected payments can now be reopened (previously a dead end with no recovery path in the UI).
- Draft gameweeks that were created by mistake can now be deleted (only before they're ever opened).

**Performance**
- `/my-entries`: per-entry eligibility checks now run in parallel instead of one sequential DB round
  trip per entry.
- `/admin/schedule` and the public `/c/[slug]/fixtures`: only the gameweeks shown open by default get
  full fixture+team data; the collapsed "N more gameweeks" section is metadata-only. Cut the public
  fixtures page from ~3.6s to ~1.1s warm.

## 0.2.1 — 2026-07-17

- Added platform administrator and break-glass support roles.
- Added project provisioning and organiser recovery without participant PII access.

## 0.2.0 — 2026-07-17

- Added the LMS mobile-first visual baseline, PWA manifest, service-worker registration, and LMS app icon.
- Added the authenticated member and desktop-admin competition workflows.
- Added Prisma-backed competition, payment, fixture, pick, settlement, audit, and deadline-autopick operations.
