## Repository Instructions

- Use `pnpm` when it is available in the environment. If not, use `npm`.
- Do not add new dependencies without explicit approval.
- Keep admin-only features server-side. Never expose service-role analytics queries to student/public pages.
- Run `lint`, `typecheck`, and `build` after code changes and report results.
- In the final handoff, include:
  - full created/modified file list
  - commands run and results
  - manual database/migration steps
