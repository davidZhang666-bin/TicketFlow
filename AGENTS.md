# TicketFlow contributor instructions

- Deliver only the current Asia/Shanghai calendar day's milestone. Day 1 is 2026-10-23;
  days 2–5 are 2026-10-24 through 2026-10-27. Fix incomplete earlier work first.
- Read docs/roadmap.md and docs/progress.md before continuing. Mark implemented behavior
  separately from planned behavior. Do not implement reservations before day 2.
- Preserve meaningful commits. Use codex/ branches and Conventional Commits; preserve
  commits when merging PRs. No empty commits or manufactured history.
- PostgreSQL is authoritative. All business mutations must be transactional and idempotent.
- Keep domain rules independent of NestJS and React. Validate untrusted inputs at boundaries.
- Never commit credentials, generated local environments, database files or node_modules.
- Run relevant checks and report exactly which checks ran. Integration tests require real
  PostgreSQL and Redis. Never substitute an in-memory adapter for an integration result.
- Keep public API and generated client types synchronized. Use integer cents and UTC instants.
