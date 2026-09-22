# Locked decisions (MVP)

Decisions from SPEC §17, locked for implementation.

| # | Decision | Choice |
|---|----------|--------|
| 1 | **Payment gating** | **Option A:** Only "approved paid" Entries can submit picks. |
| 2 | **Autopick tie-break** | Earliest kick-off in that Gameweek, then alphabetical by team name. |
| 3 | **Fixture source** | Manual entry for MVP; automated import later. |
| 4 | **Split winners (≤5 wipe-out)** | Record as "Split winners" in UI and in WhatsApp message; list winning Entry IDs. |
| 5 | **Wipeout threshold** (2026-09-22) | Configurable per season via `rules.wipeout.splitPrizeAtOrBelowEntries`, default 5. Was previously hardcoded in `settleGameweek` despite the config field already existing — fixed to actually read it. |
| 6 | **Club branding vs. platform theme** (2026-09-22) | The app's own dark "Matchday Energy" identity is fixed and never swapped per club. A club's own branding (logo/colour/name) is confined to isolated badge elements (a bordered card, an accent stripe, one CTA button) rather than tinting whole pages or popups — chosen specifically so an organiser's bad or clashing colour choice can't break page readability. |
| 7 | **Transactional email provider** (2026-09-22) | Resend, sending from `lastman@1zero9.com` (root-domain address — a subdomain would need its own separate DKIM/SPF verification, which the Resend plan in use doesn't support alongside the existing verified domain). |
| 8 | **Admin stays outside the theme rollout** (2026-09-22) | Matchday Energy applies to player-facing and public pages only. Admin pages share the root layout (single shared header/nav/dock, no route groups yet), so a true edge-to-edge per-route background swap would need a larger layout restructure — deferred; each themed page currently renders as a large dark panel within the existing content column rather than bleeding to the viewport edge. |
