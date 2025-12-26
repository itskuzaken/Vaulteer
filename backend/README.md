# Backend notes

Environment variables:

- The backend loads `.env` from the `backend/` directory via `dotenv`.
- To disable scheduled background jobs during local development (so local processes don't try to connect to production DBs), set `DISABLE_SCHEDULED_JOBS=true` in `backend/.env`.

Example (backend/.env):

DB_HOST=localhost
DB_USER=root
DB_PASS=secret
DB_NAME=vaulteer_db
DISABLE_SCHEDULED_JOBS=true

This avoids errors like `getaddrinfo ENOTFOUND <rds-host>` when your local environment cannot reach the production database.