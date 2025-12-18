# Migrations guide

This repository uses SQL migrations stored under `backend/migrations/`.

Important: Before rolling any code that relies on new DB columns to staging or production, run the migration that adds the column(s). For the per-tier points change added by this work there is a migration:

- `backend/migrations/20251220_add_tier_points_column.sql` — adds `tier_points` JSON column to `achievements`
- `backend/migrations/20251218_set_specific_core_badges_tier_points.sql` — sets per-tier `tier_points` for core badges (community_staple, early_bird, perfect_streak, punctual_pro, ocr_wizard)

To run migrations locally or on a server with the app code:

1. Ensure your DB connection environment variables are set for the target environment (staging/production).
2. From the `backend/` directory, run:

   npm run migrate

This will execute the SQL file(s) against the configured database.

Testing notes:
- Run the backend test suite locally after installing dev dependencies (npm ci) to validate changes in your environment.
- If `npm ci` fails due to locked files or permissions, make sure no processes are using node_modules files (editors, dev servers) and retry with Administrator privileges if required.

If you need help running migrations on a staging environment, tell me which environment and I can prepare the exact commands and a short rollback plan.
