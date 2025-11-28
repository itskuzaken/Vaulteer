# Hybrid API Security Implementation

This document explains the hybrid security approach implemented for the Vaulteer API, combining Firebase authentication for public endpoints with server-only internal endpoints.

## Overview

The API now has two security layers:

1. **Public API Routes** (`/api/*`) - Protected by Firebase ID tokens for authenticated users
2. **Internal API Routes** (`/api/internal/*`) - Protected by server-only secret token for server-to-server communication

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser Client                       │
│  (Next.js Client Components + Firebase Auth)                │
└────────────────┬────────────────────────────────────────────┘
                 │ Firebase ID Token
                 ▼
         ┌───────────────────┐
         │   nginx (443)     │
         │  TLS Termination  │
         └────────┬──────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
        ▼                    ▼
┌──────────────┐    ┌──────────────────┐
│  Next.js     │    │  Express Backend │
│  (port 3000) │    │  (port 5000)     │
│              │    │                  │
│  - SSR       │◄───┤ Public Routes:   │
│  - Actions   │    │  /api/*          │
│              │    │  (Firebase auth) │
└──────┬───────┘    │                  │
       │            │ Internal Routes: │
       │ X-Internal │  /api/internal/* │
       │   Token    │  (Token auth)    │
       └───────────►│                  │
                    └──────────────────┘
```

## Implementation Details

### Backend Components

#### 1. Internal-Only Middleware (`backend/middleware/internalOnly.js`)

Validates the `X-INTERNAL-TOKEN` header against the `INTERNAL_API_TOKEN` environment variable.

**Behavior:**

- ✅ Allows requests with valid token
- ❌ Rejects requests without token (403 Forbidden)
- ⚠️ Logs all rejection attempts for security monitoring
- 🔧 In development mode, allows bypass if token not set (convenience)

**Usage:**

```javascript
const internalOnly = require("./middleware/internalOnly");
app.use("/api/internal", internalOnly, internalRoutes);
```

#### 2. Internal Routes (`backend/routes/internalRoutes.js`)

Example endpoints that should NEVER be called from browsers:

- `GET /api/internal/health` - Detailed system health check including DB status
- `POST /api/internal/refresh-cache` - Force cache refresh operations
- `GET /api/internal/stats/detailed` - Sensitive system statistics

**Security:**
All routes under `/api/internal/*` are protected by the `internalOnly` middleware and require the secret token.

### Frontend Components

#### 1. Internal API Client (`frontend/src/services/internalApiClient.js`)

**⚠️ SERVER-SIDE ONLY** utility for calling internal endpoints.

**Safe to use in:**

- ✅ Server Components (React Server Components)
- ✅ Server Actions (`'use server'` directive)
- ✅ API Routes (`/app/api/*`)
- ✅ `getServerSideProps` / `getStaticProps`

**NEVER use in:**

- ❌ Client Components
- ❌ Browser-side code
- ❌ Any code that bundles to the client

**Functions:**

```javascript
// Low-level call
callInternalApi(endpoint, options);

// JSON response helper
callInternalApiJson(endpoint, options);

// Convenience methods
getDetailedStats();
refreshCache(cacheKey, force);
checkInternalHealth();
```

#### 2. Example Server Actions (`frontend/src/services/examples/internalServerAction.js`)

Demonstrates how to use internal API calls from Next.js Server Actions:

```javascript
"use server";

import { callInternalApiJson } from "../internalApiClient";

export async function getInternalStats() {
  const stats = await callInternalApiJson("/api/internal/stats/detailed");
  return { success: true, data: stats };
}
```

**Client usage:**

```javascript
// In a client component
import { getInternalStats } from "@/services/examples/internalServerAction";

function AdminDashboard() {
  const handleRefresh = async () => {
    const result = await getInternalStats();
    if (result.success) {
      console.log(result.data);
    }
  };

  return <button onClick={handleRefresh}>Refresh Stats</button>;
}
```

## Environment Configuration

### Backend (`.env`)

```bash
# Generate strong token (32+ characters)
openssl rand -base64 32

# Add to backend/.env
INTERNAL_API_TOKEN=your_generated_token_here

# Already configured
TRUST_PROXY=1
```

### Frontend (`.env.production`)

```bash
# MUST match backend token
INTERNAL_API_TOKEN=your_generated_token_here

# Backend URL for server-side calls (localhost since on same host)
BACKEND_INTERNAL_URL=http://127.0.0.1:5000

# DO NOT use NEXT_PUBLIC_ prefix - must remain server-side only
```

## Security Considerations

### ✅ What This Protects

1. **Server-only operations** - Cache management, system stats, admin tasks
2. **Sensitive data** - Information that shouldn't be exposed to public API
3. **Internal workflows** - Background jobs, scheduled tasks, SSR operations

### ⚠️ What This Doesn't Protect

1. **Public API endpoints** - Still require proper Firebase authentication
2. **Network-level attacks** - Consider adding nginx rate limiting or WAF
3. **Compromised server** - If server is compromised, attacker has token access

### 🔒 Best Practices

1. **Token Strength**

   ```bash
   # Generate strong tokens (minimum 32 characters)
   openssl rand -base64 32
   ```

2. **Token Rotation**

   - Rotate tokens periodically (quarterly recommended)
   - Rotate immediately if you suspect compromise
   - Update both backend and frontend .env files

3. **Never Commit Tokens**

   ```gitignore
   # Ensure .env files are in .gitignore
   .env
   .env.production
   .env.local
   ```

4. **Monitor Failed Attempts**

   - Check logs for repeated 403s at `/api/internal/*`
   - Set up alerts for suspicious patterns
   - Consider rate limiting at nginx level

5. **File Permissions**
   ```bash
   # Restrict access to .env files
   chmod 600 backend/.env
   chmod 600 frontend/.env.production
   ```

## Optional: Enhanced Network-Level Protection

### Nginx Configuration (Recommended)

Add header sanitization to prevent clients from spoofing the internal token:

```nginx
location /api/ {
    # Remove any client-supplied internal token headers
    proxy_set_header X-Internal-Token "";

    proxy_pass http://127.0.0.1:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Optional: Make internal routes completely inaccessible from outside
location /api/internal/ {
    # Deny all external access
    deny all;
    return 403;
}
```

### mTLS (Advanced)

For maximum security, implement mutual TLS between Next.js and Express:

1. Generate client certificates for Next.js server
2. Configure Express to require and validate client certificates
3. Update `internalApiClient.js` to present client cert

This is overkill for most deployments but provides defense-in-depth.

## Testing

### Test Internal Endpoint Protection

```bash
# Should FAIL (no token)
curl https://vaulteer.kuzaken.tech/api/internal/health
# Expected: 403 Forbidden

# Should FAIL (wrong token)
curl -H "X-Internal-Token: wrong" https://vaulteer.kuzaken.tech/api/internal/health
# Expected: 403 Forbidden

# Should SUCCEED (correct token, from server)
# This test must run ON the server or via SSH
curl -H "X-Internal-Token: $INTERNAL_API_TOKEN" http://127.0.0.1:5000/api/internal/health
# Expected: 200 OK with health data
```

### Test Server Action

Create a test page in Next.js:

```javascript
// app/admin/test/page.js
"use server";

import { checkSystemHealth } from "@/services/examples/internalServerAction";

export default async function TestPage() {
  const health = await checkSystemHealth();

  return (
    <div>
      <h1>Internal API Test</h1>
      <pre>{JSON.stringify(health, null, 2)}</pre>
    </div>
  );
}
```

Visit `https://vaulteer.kuzaken.tech/admin/test` - should show health data.

## Migration Guide

### For Existing Endpoints

If you have existing endpoints that should be internal-only:

1. **Move the route**

   ```javascript
   // Before: /api/admin/sensitive
   // After:  /api/internal/sensitive
   ```

2. **Update Next.js calls**

   ```javascript
   // Before: direct fetch to /api/admin/sensitive with Firebase token
   // After: use internalApiClient in server action

   "use server";
   import { callInternalApiJson } from "@/services/internalApiClient";

   export async function getSensitiveData() {
     return callInternalApiJson("/api/internal/sensitive");
   }
   ```

3. **Remove Firebase auth** (if endpoint is purely internal)
   ```javascript
   // Internal routes don't need verifyToken middleware
   // They use internalOnly instead
   ```

### Gradual Rollout

1. Start with new internal-only features
2. Test thoroughly in development
3. Deploy to production
4. Monitor logs for any issues
5. Gradually migrate existing sensitive endpoints

## Troubleshooting

### "Forbidden" errors in Next.js server logs

**Cause:** `INTERNAL_API_TOKEN` mismatch or not set

**Fix:**

```bash
# On server, verify tokens match
cd /opt/vaulteer/app/backend
grep INTERNAL_API_TOKEN .env

cd /opt/vaulteer/app/frontend
grep INTERNAL_API_TOKEN .env.production

# They must be identical
```

### Internal API client used in browser

**Symptom:** `INTERNAL_API_TOKEN is undefined` in browser console

**Cause:** Attempting to import `internalApiClient` in client component

**Fix:** Only use in server-side code. For client components, create a Server Action wrapper.

### Rate limit issues after adding trust proxy

**Cause:** `req.ip` returning wrong value

**Fix:** Ensure `TRUST_PROXY=1` is set in backend .env and PM2 config

## Support & Questions

For questions about this implementation:

- Check `untitled-plan-apiRestrictedToFrontend.prompt.md` for original design doc
- Review `PRODUCTION_DEPLOYMENT_GUIDE.md` for deployment instructions
- Check backend logs: `pm2 logs vaulteer-backend`
- Check frontend logs: `pm2 logs vaulteer-frontend`
