# Product design baseline

## Primary surface: member PWA

- Design mobile-first. The first viewport must show the member's current competition action: make, review, or await a pick.
- Use the installed Last Man Standing app experience: compact navy header and a four-item bottom navigation.
- Navy (`#0D1B2A`) is the app shell; primary green (`#0A6B2E`) identifies competition state; lime (`#A3E635`) is reserved for the main action, wins, and fundraising highlights.
- Use white/off-white cards for operational content. Avoid decorative gradients and long explanatory panels ahead of the primary action.

## Desktop surface: admin

- Admin workflows are desktop-first from the `md` breakpoint upward, with denser tables, forms, and action panels.
- Admin pages remain usable on mobile, but member navigation stays intentionally focused on member actions.

## Versioning

- `package.json` and `lib/app-info.ts` are updated together for every visible release.
- Add a dated entry to `CHANGELOG.md` for each version with member-facing, admin, data, or infrastructure changes.
