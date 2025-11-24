Goal: Make https://vaulteer.kuzaken.tech/api/ inaccessible to anyone except legitimate calls originating from the frontend app (Next.js), while keeping a secure, practical setup for real users and server-side operations.

Constraints & Reality

- Browser clients (frontend running in users' browsers) cannot keep a secret: anything in client-side JS is discoverable.
- "Only frontend can call the API" is therefore impossible if the frontend runs in the user's browser. We must protect endpoints by authentication and/or create true server-to-server-only endpoints.

Recommended strategy (hybrid, pragmatic, secure)

1. Enforce user authentication for all public API routes (Firebase ID tokens)

   - All public endpoints that the browser uses should require valid Firebase ID tokens.
   - Continue verifying tokens server-side (admin SDK) using your existing middleware.
   - Protect admin operations with role checks.

2. Create server-only (internal) endpoints for any operation that must only be callable by your server (Next.js SSR/
   server actions / background jobs)

   - Implement `internalOnly` middleware that requires a strong secret header (e.g. X-INTERNAL-TOKEN).
   - Keep that secret server-side only: store it in backend `.env` and only set it for server-side Next.js env when you need SSR calls.
   - Do NOT store this secret in NEXT*PUBLIC* env vars or in client-bundled code.
   - Optionally bind these routes to `127.0.0.1` / only allow local connections and call via localhost from the Next server.

3. (Optional) Add a network layer protection for extra guarantee
   - Use nginx/CloudFront/WAF or mTLS so only your frontend server or reverse proxy can forward requests to backend internals.
   - Example: set nginx to add X-INTERNAL-TOKEN only when proxying from the local host and do not expose that header to clients.

Trade-offs

- Approach #1 alone (auth tokens) is necessary and protects user-level endpoints, but a valid token allows calling API from anywhere.
- Approach #2 (internal endpoints) gives real exclusivity for server-only APIs and is the only reliable method to make endpoints inaccessible to end-users.
- Approach #3 is very strong but requires more infrastructure and ops complexity.

Implementation plan (step-by-step)

A. Add `internalOnly` middleware to backend

- File: backend/middleware/internalOnly.js
- Behavior:
  - In production require `process.env.INTERNAL_API_TOKEN`. In development allow bypass if desired.
  - Validate `req.headers['x-internal-token'] === process.env.INTERNAL_API_TOKEN`.
  - Log and return 403 on mismatch.

Example implementation:

```js
// backend/middleware/internalOnly.js
const { CONFIG } = require("../config/env");

function internalOnly(req, res, next) {
  const token = process.env.INTERNAL_API_TOKEN;
  if (!token) {
    if (CONFIG.NODE_ENV === "production") {
      console.error("[internalOnly] INTERNAL_API_TOKEN missing in production");
      return res.status(500).json({ error: "Server misconfiguration" });
    }
    return next(); // dev convenience
  }

  const supplied = req.headers["x-internal-token"];
  if (supplied === token) return next();

  console.warn("[internalOnly] rejected", { path: req.path, ip: req.ip });
  return res.status(403).json({ error: "Forbidden" });
}

module.exports = internalOnly;
```

B. Register internal-only admin routes

- Create routes under `/api/internal` and protect with `internalOnly`.
- Keep only server-side logic that truly requires exclusivity under these routes.

C. Call internal endpoints from Next.js server-side (SSR/server components)

- Use server-only fetch calls (from server environment) with the secret header.

Example Next.js SSR code (server-only):

```js
// Next.js server-side (not in client code)
await fetch("http://127.0.0.1:5000/api/internal/refresh-cache", {
  method: "POST",
  headers: {
    "x-internal-token": process.env.INTERNAL_API_TOKEN,
    "content-type": "application/json",
  },
  body: JSON.stringify({ force: true }),
});
```

D. Add Nginx protections (optional, stronger)

- Configure nginx to only add the X-INTERNAL-TOKEN header when proxying from server -> backend.
- Make sure public clients can't set the header by sanitizing headers in nginx config and not forwarding user-supplied internal headers.

nginx example snippet:

```nginx
location /api/internal/ {
  internal; # optional nginx directive to make location only accessible from internal redirects
  proxy_pass http://127.0.0.1:5000;
  proxy_set_header X-INTERNAL-TOKEN "${INTERNAL_TOKEN}";
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

E. Deploy & configs

- Add `INTERNAL_API_TOKEN` to `backend/.env` (production only) and to the Next.js server runtime env (not NEXT*PUBLIC*) so SSR calls can be made.
- Ensure its file permissions are strict (chmod 600) and store in Secrets Manager for larger infra.

F. Tests & Validation

- Unit test middleware to reject missing/incorrect token.
- End-to-end test: call internal route from server via fetch using `INTERNAL_API_TOKEN` -> should return success.
- Attempt a request from browser (developer tools) without token -> should be 403.

G. Logging & monitoring

- Log all failures to a monitoring/alerting destination (CloudWatch/Datadog) so we can detect abuse attempts.

H. Roll-out notes

- Deploy the middleware and a single internal endpoint first; ensure Next's server-side code calls it successfully.
- Gradually move sensitive-only operations from public routes to internal routes.
- When comfortable, consider adding nginx mTLS or restrict by IP + internal token for deeper security.

I. Next steps (pick one or both)

1. Implement `internalOnly` middleware + sample internal route in `backend` (I can do this now).
2. Add server-side Next.js example to call internal route and demonstrate a test-case (I can do this next).
3. Add nginx mTLS or WAF instructions and examples for infra-level protection.

---

Notes

- Keep secrets out of `NEXT_PUBLIC_` variables.
- Use Secrets Manager or environment files with strict perms in production.
- Keep audit logs and alert on repeated 403 attempts to internal-only routes.

If you want, I’ll implement option 1 (middleware + sample route) now and push it to the repo so you can test on the server. Which of the next steps would you like me to do first?
