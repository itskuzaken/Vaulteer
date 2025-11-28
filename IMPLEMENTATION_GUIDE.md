# Hybrid API Security - Implementation Guide

This document provides step-by-step instructions for implementing and deploying the hybrid API security system described in `HYBRID_API_SECURITY.md`.

## 🚀 Quick Setup

### Option 1: Automated Setup (Recommended)

**Windows:**

```bash
./setup-security.bat
```

**Linux/macOS:**

```bash
chmod +x setup-security.sh
./setup-security.sh
```

### Option 2: Manual Setup

1. **Generate Internal API Token**

   ```bash
   # Linux/macOS/WSL
   openssl rand -base64 32

   # Windows PowerShell
   $bytes = New-Object byte[] 32; [Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes); [Convert]::ToBase64String($bytes)
   ```

2. **Configure Backend Environment**

   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env and set:
   INTERNAL_API_TOKEN=your_generated_token_here
   ```

3. **Configure Frontend Environment**
   ```bash
   cp frontend/.env.example frontend/.env.production
   # Edit frontend/.env.production and set:
   INTERNAL_API_TOKEN=your_generated_token_here
   ```

## 🔧 Configuration Details

### Backend Configuration (`backend/.env`)

```bash
# Required for hybrid API security
INTERNAL_API_TOKEN=your_32_char_token_here
TRUST_PROXY=1

# Database (required in production)
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=vaulteer_db

# Firebase (choose one method)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
# OR
FIREBASE_SERVICE_ACCOUNT=firebase-service-account.json

# Server
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com
```

### Frontend Configuration (`frontend/.env.production`)

```bash
# Required for hybrid API security (MUST match backend)
INTERNAL_API_TOKEN=your_32_char_token_here
BACKEND_INTERNAL_URL=http://127.0.0.1:5000

# Firebase client config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=yourproject.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id

# API URLs
NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com
```

## 🧪 Testing the Implementation

### 1. Development Testing

1. **Start the backend:**

   ```bash
   cd backend
   npm install
   npm start
   ```

2. **Start the frontend:**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Test internal API:**
   - Visit: `http://localhost:3000/admin/test`
   - Should display system health information
   - Check browser network tab - no internal API calls visible

### 2. Production Testing

1. **Build and start both services:**

   ```bash
   # Backend
   cd backend && npm start

   # Frontend
   cd frontend && npm run build && npm start
   ```

2. **Test external access (should fail):**

   ```bash
   # Should return 403 Forbidden
   curl https://yourdomain.com/api/internal/health

   # Should return 403 Forbidden
   curl -H "X-Internal-Token: wrong" https://yourdomain.com/api/internal/health
   ```

3. **Test internal access (on server only):**
   ```bash
   # Should succeed (run this ON the server)
   curl -H "X-Internal-Token: $INTERNAL_API_TOKEN" http://127.0.0.1:5000/api/internal/health
   ```

## 🔒 Security Verification

### Check Token Strength

```bash
# Verify token is at least 32 characters
echo $INTERNAL_API_TOKEN | wc -c
# Should output 45+ (base64 encoding adds overhead)
```

### Verify Environment Variables

```bash
# Backend
grep INTERNAL_API_TOKEN backend/.env

# Frontend
grep INTERNAL_API_TOKEN frontend/.env.production

# Tokens should match exactly
```

### Check File Permissions

```bash
# Secure environment files
chmod 600 backend/.env
chmod 600 frontend/.env.production

# Verify
ls -la */.*env*
```

## 🚨 Troubleshooting

### "Forbidden" errors in server logs

**Cause:** Token mismatch between frontend and backend

**Solution:**

```bash
# Compare tokens
diff <(grep INTERNAL_API_TOKEN backend/.env) <(grep INTERNAL_API_TOKEN frontend/.env.production)
# Should show no differences
```

### "INTERNAL_API_TOKEN is undefined" in browser

**Cause:** Attempting to use `internalApiClient` in client-side code

**Solution:** Move the code to a Server Action or API Route:

```javascript
// ❌ Wrong - Client Component
import { callInternalApiJson } from "@/services/internalApiClient";

// ✅ Correct - Server Action
("use server");
import { callInternalApiJson } from "@/services/internalApiClient";
export async function getStats() {
  return await callInternalApiJson("/api/internal/stats/detailed");
}
```

### Rate limiting issues

**Cause:** `req.ip` not properly detected

**Solution:** Ensure `TRUST_PROXY=1` in backend environment

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] Generated strong INTERNAL_API_TOKEN (32+ chars)
- [ ] Token configured in both backend/.env and frontend/.env.production
- [ ] Tokens match exactly between frontend and backend
- [ ] Environment files secured (chmod 600)
- [ ] Environment files excluded from git (.env\* in .gitignore)
- [ ] Firebase credentials configured
- [ ] Database credentials configured
- [ ] TRUST_PROXY=1 set in backend

### Post-Deployment

- [ ] Test internal API endpoints return 403 for external requests
- [ ] Test admin test page loads and shows health data
- [ ] Monitor logs for unauthorized internal API attempts
- [ ] Verify rate limiting works correctly
- [ ] Check all dashboard functionality works

## 🔄 Token Rotation

### When to Rotate

- Quarterly (recommended schedule)
- Immediately if compromise suspected
- Before/after team member changes
- After security incidents

### How to Rotate

1. Generate new token: `openssl rand -base64 32`
2. Update backend/.env with new token
3. Update frontend/.env.production with new token
4. Restart both services
5. Test functionality
6. Securely delete old token

## 📊 Monitoring

### Key Metrics to Track

- Failed internal API attempts (403 responses)
- Rate limit violations
- Authentication failures
- Abnormal request patterns

### Log Analysis

```bash
# Check for unauthorized internal API attempts
grep "rejected unauthorized internal API call" backend/logs/*

# Check rate limiting
grep "Too many requests" backend/logs/*
```

## 🆘 Emergency Response

### If Token is Compromised

1. Immediately generate new token
2. Update both environment files
3. Restart services
4. Review logs for suspicious activity
5. Consider additional security measures

### If System is Breached

1. Rotate all tokens immediately
2. Review all internal API endpoints
3. Check for data exfiltration
4. Update security measures
5. Conduct security audit

## 📚 Additional Resources

- [HYBRID_API_SECURITY.md](./HYBRID_API_SECURITY.md) - Complete system documentation
- [Backend Internal Routes](./backend/routes/internalRoutes.js) - Available endpoints
- [Frontend Client](./frontend/src/services/internalApiClient.js) - Usage examples
- [Server Actions](./frontend/src/services/examples/internalServerAction.js) - Implementation patterns
