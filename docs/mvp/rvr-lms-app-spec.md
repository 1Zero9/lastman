# RVR Last Man Standing (LMS) — Standalone App Spec (Invite-only)

**Purpose:** A lightweight, invite-only web app to run River Valley Rangers’ Premier League *Last Man Standing* fundraising competition with minimal admin overhead (no spreadsheets, no WhatsApp chaos), using **Revolut** for payments and **magic link** sign-in.

This document is designed to be dropped into a new Git repo and used as the primary build brief for Codex / Cursor / Claude.

---

## 0) Quick summary (what we’re building)

- **Invite-only** LMS competition for RVR
- **Payments via Revolut** (admin reconciliation; no banking integration required for MVP)
- **Magic link login** (email or SMS)
- **Multiple entries (“lives”) per person** (each €10 = 1 Entry)
- Weekly picks from Premier League fixtures
- Win = survive; draw/loss = eliminated
- Cannot pick the same team twice (per Entry)
- Special **“Top 6” restriction** per rules
- Deadline automation + autopick for late/non-submitters
- Admin dashboard + audit trail + WhatsApp-ready updates
- Optional “agent” layer to automate reminders, comms, and admin Q&A (bounded and auditable)

---

## 1) Stakeholders & roles

### Roles
- **Entrant (Person):** A real person who can hold multiple **Entries**.
- **Entry (Life):** A paid participation unit. Each Entry plays independently.
- **Admin/Organiser:** Creates competition, manages invites, reconciles payments, closes weeks, processes results, and resolves disputes.
- **(Optional) Assistant Agent:** Executes bounded tasks (reminders, message drafts, status queries) with full auditability; no autonomous rule changes.

---

## 2) Non-goals (avoid scope creep)

- No public sign-ups (invite-only only)
- No full Revolut API integration required for MVP
- No complex payments flow inside the app (record and reconcile is enough)
- No fantasy scoring, no points, no “most goals” etc. (strict LMS)
- No social feed or chat features in-app (WhatsApp remains for comms)

---

## 3) Rules (implement exactly as supplied)

> The app must implement the rules below as the single source of truth (with only deterministic tie-breakers added where the rules are ambiguous).

### 3.1 Weekly pick requirement
- Each **Entry** picks **one** Premier League team per Gameweek.

### 3.2 Survival rule
- If the selected team **wins** its match → Entry remains **Alive**.
- If the selected team **draws or loses** → Entry is **Eliminated**.

### 3.3 No repeats
- An Entry may **not pick the same team twice** throughout the competition.

### 3.4 “Top 6” restriction (as stated in your rules)
For each Entry:
- You may use **only ONE** of the following teams across the entire competition:
  - Arsenal, Man City, Aston Villa, Man United, Chelsea, Liverpool
- If an Entry picks one of these once, that Entry **cannot pick any of the other five afterwards**.

> Note: This rule is *stricter* than normal LMS. Treat it as a hard constraint in validation and UI.

### 3.5 Deadline / cut-off
- Picks must be submitted by **18:00 the day before the Gameweek fixtures begin**.
- If there is a **Friday** fixture, the deadline is **Thursday 18:00**.

### 3.6 No pick received → autopick
- If an Entry has **no pick** by the deadline, they are assigned **“the most popular team that week”**.

**Ambiguity that must be made deterministic for the app:**
- If there’s a tie for “most popular”, apply a tie-breaker rule (see §3.6.1).

#### 3.6.1 Autopick tie-breaker (deterministic)
To implement “most popular team” reliably, pick an approach and keep it consistent:
- **Primary:** Most popular among picks submitted before the deadline.
- **Tie-break (recommended):** Choose the tied team with the **earliest kick-off** in that Gameweek.
- **Fallback:** Alphabetical by team name.

(Record which tie-break was used in the audit trail.)

### 3.7 Wipe-out behaviour
If **all remaining Entries** are eliminated in the same round:
- If **≤ 5** Entries were remaining → **split the prize fund** between them
- If **> 5** Entries were remaining → **roll over** to the next Gameweek

> If RVR later decides “single winner only”, this is a rule change; keep it out of MVP unless admins explicitly update the rules.

### 3.8 Disputes
- Disputes are resolved by organiser vote. The app should preserve an audit trail and allow admins to override outcomes with recorded reason.

---

## 4) Key product behaviours

### 4.1 Invite-only + magic link access
- Admin generates invites for people (name + email/phone optional).
- Entrant receives an invite link (WhatsApp/SMS/email).
- Entrant signs in via **magic link** (email or SMS).
- Session should be persistent (reasonable duration) but support logout and re-auth.

### 4.2 Multiple Entries (“Lives”)
- A Person can have **N** Entries (paid lives).
- Each Entry:
  - Has its own pick history
  - Is validated independently
  - Can be Alive or Eliminated independently
- UI must clearly show “Entry #1 / Entry #2 / …” so a person doesn’t accidentally pick for the wrong life.

### 4.3 Payments via Revolut (MVP)
- Entry is €10 per Entry.
- App supports:
  - Person declares how many Entries they paid for
  - Admin reconciles / approves payments (mark paid, adjust entry count)
- Prize fund: store totals and allocations (e.g., 30% prize / 70% trip) for transparency.
- IMPORTANT: The app should work even if payment status is pending (e.g., allow pick submission only for “paid/approved” Entries, OR allow but clearly mark as “pending payment” — choose one policy).

---

## 5) User journeys (MVP)

### 5.1 Entrant journey
1. Open invite link
2. Confirm identity (name) + request magic link (email/SMS)
3. Sign in
4. View dashboard:
   - Current Gameweek + countdown to deadline
   - Their Entries (lives) and status
   - For each Entry: current week pick status (picked / not picked / autopicked)
   - “Used teams” list per Entry
5. Make a pick for a specific Entry
6. Receive confirmation on screen (and optional message)
7. After results:
   - See whether each Entry survived
   - See “used teams” updated
   - See next deadline

### 5.2 Admin journey
1. Create competition (name, start date, rules locked)
2. Create Gameweek (fixtures window + deadline)
3. Invite entrants / manage list
4. Reconcile payments & create Entries per person
5. Monitor:
   - Entries not picked
   - Most popular pick live tally
6. At deadline:
   - Lock picks
   - Autopick for missing Entries
   - Generate WhatsApp-ready picks summary
7. After matches:
   - Process results
   - Auto-eliminate / survive updates
   - Handle wipe-out rule
   - Generate survivors + eliminated message
8. Disputes:
   - View audit trail
   - Apply override with reason (logged)

---

## 6) Screens (suggested MVP)

### Entrant-facing
- **Sign-in / Magic link request**
- **Dashboard**
  - Current week status + countdown
  - Entries list (cards)
- **Pick screen (per Entry)**
  - Available teams list (with disabled teams already used / top-6 locked)
  - Confirm pick
- **Pick history (per Entry)**
- **Rules page** (read-only)

### Admin-facing
- **Admin dashboard**
- **People & Entries**
  - Person list, Entry counts, payment status
- **Invites**
- **Gameweeks**
  - Create / open / lock
- **Picks overview**
  - Filter: not picked / by team / by Entry status
- **Results processing**
  - Process completed fixtures
- **Audit log**
- **Messages**
  - Copy-ready WhatsApp outputs

---

## 7) Data model (conceptual)

### Person
- id
- name
- email (optional)
- phone (optional)
- created_at
- last_login_at

### Entry (Life)
- id
- person_id
- entry_number (1..N)
- status: alive | eliminated
- eliminated_week_id (nullable)
- payment_status: pending | approved | rejected
- created_at

### Competition
- id
- name
- season_label (optional)
- entry_fee (default €10)
- prize_split_percent (default 30)
- trip_split_percent (default 70)
- rules_version / rules_hash
- created_at

### Gameweek
- id
- competition_id
- label (e.g., GW1)
- start_datetime
- deadline_datetime (18:00 rule)
- status: upcoming | open | locked | settled
- created_at

### Fixture
- id
- gameweek_id
- home_team
- away_team
- kickoff_datetime
- status: scheduled | finished | postponed | cancelled
- home_score (nullable)
- away_score (nullable)

### Pick
- id
- entry_id
- gameweek_id
- team_selected
- method: user | autopick
- submitted_at
- locked_at
- outcome: win | draw | loss | void | pending

### AuditEvent
- id
- actor: system | admin | person
- actor_id (nullable)
- event_type
- payload (structured)
- created_at

---

## 8) Validation rules (must be enforced)

When submitting a pick for an Entry:
- Gameweek is **open**
- Current time is **before deadline**
- Entry is **alive**
- Team is eligible:
  - Not previously used by that Entry
  - Top-6 restriction:
    - If Entry has used any “Top 6” team previously → block all other Top 6 teams
    - If Entry is selecting a Top 6 team now → allow only if no Top 6 used previously
- Prevent selecting a team without a fixture in that Gameweek (if fixtures are loaded)

---

## 9) Weekly automation (system behaviours)

### 9.1 Deadline locking
At deadline:
- Lock all picks for that Gameweek
- For each alive Entry without a pick:
  - Assign autopick (“most popular team” + tie-break)
  - Log audit event
- Generate a “Week Picks Summary” message (copy-ready)

### 9.2 Results processing
Once fixtures finish:
- Determine outcome for each Pick:
  - If selected team won → win
  - If draw/loss → eliminate Entry
- Apply wipe-out behaviour:
  - If all remaining Entries eliminated in same round:
    - ≤5: mark as “split winners”
    - >5: reinstate and continue (or roll status per rules)
- Log audit events for all changes
- Generate “Survivors / Eliminated” message

---

## 10) “Agent” layer (optional, but designed in)

The system can include an assistant agent, but it must be **bounded, auditable, and non-authoritative**.

### Allowed agent actions (recommended)
- Draft WhatsApp messages based on system state (no rule changes)
- Send reminders (if messaging integration exists) OR produce reminder lists for admins
- Answer admin questions by reading app state:
  - “Who hasn’t picked?”
  - “What’s the most popular?”
  - “How many Entries are alive?”
- Produce dispute packs (audit trail snapshots)

### Forbidden agent actions
- Changing rules
- Overriding results
- Adding/removing entries without admin approval
- Making discretionary choices not defined in rules/tie-breakers

---

## 11) Repo structure (suggested)

Keep it simple and clean. Example structure:

- `/docs`
  - `SPEC.md` (this file)
  - `RULES.md` (public-facing rules to share)
  - `RUNBOOK.md` (weekly admin steps)
- `/app`
  - frontend (web UI)
- `/api`
  - backend endpoints / server
- `/infra`
  - deployment notes, environment variables
- `/scripts`
  - fixture import helpers, data maintenance
- `README.md`
  - setup + how to run + how to operate weekly

> If using a monorepo, keep a single root with clear boundaries. Otherwise separate repos is fine, but MVP can be a single repo.

---

## 12) Non-functional requirements

### Security & privacy
- Invite-only: no public listing, no search indexing
- Magic links must be single-use and time-limited
- Protect admin routes
- Store minimal personal data (name + contact)
- Provide an audit log for admin actions

### Reliability
- Deadline enforcement must be timezone-safe (Europe/Dublin)
- Automation tasks should be idempotent (safe to re-run without duplication)

### Usability
- Entrant experience must be mobile-first (most will use WhatsApp on phones)
- Clear separation between a Person’s multiple Entries

---

## 13) Edge cases (handle intentionally)

- **Late pick:** blocked after deadline; autopick applies
- **Postponed fixture:** fixture status not “finished” → pick outcome stays pending; admins can delay settling
- **Cancelled/abandoned match:** requires organiser decision; support admin override with reason
- **Fixture list changes after deadline:** keep picks locked; admin can use dispute vote if needed
- **Autopick team invalid for some Entry** (e.g., already used or top-6 restriction):
  - The “most popular team” must be chosen **per Entry eligibility**, not globally.
  - Approach:
    1) Compute global popularity rank
    2) For each missing Entry, assign the highest-ranked team they are eligible to pick
  - Log the assignment and which constraint caused skipping teams.

---

## 14) Admin runbook (weekly cadence)

### Before Gameweek opens
- Create/open new Gameweek
- Load fixtures (or set eligible teams list)
- Confirm deadline (18:00 rule)

### During open window
- Invite entrants
- Reconcile payments and create Entries
- Monitor non-submitters

### At deadline
- Lock picks
- Autopick for missing
- Share picks summary

### After fixtures
- Process results
- Apply wipe-out rule if required
- Share survivors update

---

## 15) Acceptance criteria (MVP is “done” when…)

### Entrant
- Can sign in via magic link
- Can see all their Entries and status
- Can submit picks with correct validation
- Can see used teams history

### Admin
- Can create a competition + Gameweeks
- Can invite entrants
- Can create/manage Entries per person
- Can lock picks at deadline + autopick missing (with deterministic tie-break)
- Can process results and eliminate Entries correctly
- Can export/copy WhatsApp-ready messages
- Has an audit log for key events and overrides

---

## 16) Implementation notes (keep agent & automation safe)

- Make automation (deadline lock + result processing) explicit, logged, and reversible by admin override.
- Keep “rules” in a versioned config object so you can re-run audits and prove fairness.
- Build everything so it runs as a standalone repo with clear environment configuration.

---

## 17) Open decisions (record here, then lock)

These are the only items that require a decision to avoid ambiguity:

1) **Payment gating policy**
   - Option A: Only “approved paid” Entries can submit picks
   - Option B: Allow picks, but auto-exclude until payment is approved

2) **Autopick tie-break**
   - Recommended: earliest kick-off, then alphabetical

3) **Fixture source**
   - Manual entry for MVP, automated import later

4) **Split prize mechanism**
   - If ≤5 and wipe-out occurs: how to record “split winners” in UI and message

If you want, add a short “DECISIONS.md” file to the repo and lock these early.

---

## Appendix A — Why LMS is a standard fundraiser (context only)

LMS competitions are widely used by clubs and communities as fundraisers and commonly run with basic rules: pick a team each week, win to survive, can’t reuse teams. The RVR version adds a stricter “Top 6” restriction and a “most popular” autopick, both of which are still very implementable in an app.

