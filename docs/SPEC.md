# RVR Last Man Standing (LMS) — Standalone App Spec (Invite-only)

**Purpose:** A lightweight, invite-only web app to run River Valley Rangers' Premier League *Last Man Standing* fundraising competition with minimal admin overhead (no spreadsheets, no WhatsApp chaos), using **Revolut** for payments and **magic link** sign-in.

This document is designed to be dropped into a new Git repo and used as the primary build brief for Codex / Cursor / Claude.

---

## 0) Quick summary (what we're building)

- **Invite-only** LMS competition for RVR
- **Payments via Revolut** (admin reconciliation; no banking integration required for MVP)
- **Magic link login** (email or SMS)
- **Multiple entries ("lives") per person** (each €10 = 1 Entry)
- Weekly picks from Premier League fixtures
- Win = survive; draw/loss = eliminated
- Cannot pick the same team twice (per Entry)
- Special **"Top 6" restriction** per rules
- Deadline automation + autopick for late/non-submitters
- Admin dashboard + audit trail + WhatsApp-ready updates
- Optional "agent" layer to automate reminders, comms, and admin Q&A (bounded and auditable)

---

See `docs/mvp/rvr-lms-app-spec.md` for the full specification.
