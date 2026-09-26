# Admin runbook

As of 0.5.0, most of the weekly cycle runs itself. The only things left for an organiser are the parts
that inherently need a human: reconciling real-world payments, and stepping in when something needs a
judgement call.

## One-time, per competition

- Create the competition (`/admin/setup`), redeem a platform-admin-issued setup code.
- Set club branding, wipeout threshold, buy-back rules.
- Share the invite link / join code with entrants.

## Fully automatic — nothing to do

- **Fixtures & results**: pulled hourly from football-data.org onto every active competition. Manual
  entry on `/admin/results` only exists as a fallback if the API is down.
- **Round settlement**: the moment every fixture in a gameweek has a final score, the round settles
  itself — eliminations, wipeout handling, season close-out all happen without a click.
- **Lock picks & autopick**: hourly cron locks any gameweek past its deadline and assigns
  eligibility-aware autopicks to entries that didn't submit.
- **Pick reminders**: hourly cron emails any entry that still hasn't picked once the deadline is within
  24h — once per entry per gameweek, no manual chasing.
- **Season extension**: when the pre-loaded schedule runs out mid-season, the next matchweek is pulled
  in automatically. You get a `RoundAnnouncement` (dashboard + email) either way, with a one-click
  override to settle-and-split instead if you'd rather not extend.
- **Data retention**: nightly cron anonymises participant data past the retention window.

## Still manual — payments happen outside the app by design

- **Reconcile payments and create/approve Entries**: an entrant pays you directly (bank transfer, cash,
  whatever) and you confirm it on the People page — only "approved paid" entries can submit picks. This
  is the one piece of real, recurring admin work; there's no payment processor wired in.
- Rejected a payment by mistake, or it came through after all? Reopen it from "Rejected payments" on
  the People page — sends it back to "Awaiting payment".

## Disputes / anything unexpected

- View the audit log in admin.
- Apply an override with a recorded reason if needed.
