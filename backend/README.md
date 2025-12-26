# Backend notes

Environment variables:

- The backend loads `.env` from the `backend/` directory via `dotenv`.
- To disable scheduled background jobs during local development (so local processes don't try to connect to production DBs), set `DISABLE_SCHEDULED_JOBS=true` in `backend/.env`.

Redis (queues):

- Redis is used by background queues (Bull) for OCR, achievements, report generation, etc.
- Configure Redis via either `REDIS_URL` (e.g., `redis://:password@host:6379/0`) or `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD`.
- If using TLS, set `REDIS_TLS=true` and supply a TLS-capable Redis endpoint.

Example (backend/.env):

DB_HOST=localhost
DB_USER=vaulteer
DB_PASS=secret
DB_NAME=vaulteer_db
DISABLE_SCHEDULED_JOBS=true
# Redis examples
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
# or use URL
# REDIS_URL=redis://:mypassword@redis.example.com:6379/0

This avoids errors like `getaddrinfo ENOTFOUND <rds-host>` when your local environment cannot reach the production database.

Note about PM2: pm2 runs processes with a clean environment. When using an `ecosystem.config.js`, ensure your `REDIS_*` env vars are defined there (or exported in the shell) so the Node process sees them.

Tip: we provide a safety check script at `backend/scripts/check_env_safety.js` which will fail if it detects a production DB host while running in a non-production environment or if `DISABLE_SCHEDULED_JOBS` is not set to `true` in non-production environments. Run it before running CI or starting the server in development.
