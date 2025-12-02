# Redis Installation Guide for Windows

Your server is now running, but **OCR functionality is disabled** because Redis is not installed.

## Why Redis is Needed
Redis is required for the Bull job queue that processes OCR jobs in the background. Without Redis:
- ✅ Server starts successfully
- ✅ Users can submit forms
- ❌ OCR analysis won't be performed
- ❌ Admin won't see extracted data

---

## Installation Options

### Option 1: Docker (Recommended - Easiest)

**1. Install Docker Desktop:**
- Download: https://www.docker.com/products/docker-desktop/
- Install and restart your computer
- Start Docker Desktop

**2. Start Redis:**
```powershell
docker run -d --name redis -p 6379:6379 redis:alpine
```

**3. Verify Redis is running:**
```powershell
docker ps
# Should show redis container running
```

**4. Restart your Vaulteer server:**
The server will automatically detect Redis and enable OCR.

**To stop Redis:**
```powershell
docker stop redis
```

**To start Redis again:**
```powershell
docker start redis
```

---

### Option 2: Windows Native Redis

**1. Download Redis for Windows:**
- Visit: https://github.com/tporadowski/redis/releases
- Download `Redis-x64-5.0.14.1.zip` (or latest version)

**2. Extract and Install:**
```powershell
# Extract to C:\Redis
# Open PowerShell as Administrator
cd C:\Redis
.\redis-server.exe
```

**3. Keep the terminal open** (Redis must run continuously)

**4. Restart your Vaulteer server** in a different terminal

---

### Option 3: WSL2 with Ubuntu (For Advanced Users)

**1. Install WSL2:**
```powershell
wsl --install
```

**2. Install Redis in Ubuntu:**
```bash
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

**3. Verify:**
```bash
redis-cli ping
# Expected: PONG
```

---

## Quick Test

After installing Redis, check if OCR is enabled:

**1. Start your server:**
```powershell
cd C:\Users\Kuzaken\RedVault
npm run dev
```

**2. Look for this message:**
```
✓ Textract queue connected to Redis
✓ Textract OCR queue initialized
```

**3. Submit a test form:**
- Login as admin
- Submit an HTS form
- Check console logs for: `OCR job queued for form {formId}`

---

## Current Server Status

Your server is running with:
- ✅ Express API
- ✅ MySQL Database
- ✅ AWS Textract SDK installed
- ✅ Bull package installed
- ❌ Redis not connected (OCR disabled)

**Warning in logs:**
```
⚠️  Redis not available - OCR jobs will be disabled
   To enable OCR: Install Redis or start Docker container
```

---

## Troubleshooting

### Server won't start after installing Redis
- **Check if Redis is running:** `redis-cli ping` (should return PONG)
- **Check Redis port:** Make sure 6379 is not blocked by firewall
- **Check environment variables:** Ensure `REDIS_HOST=localhost` and `REDIS_PORT=6379` in `.env`

### Docker commands not found
- Install Docker Desktop first
- Restart PowerShell after installation
- Make sure Docker Desktop is running (check system tray)

### "Error: ECONNREFUSED 127.0.0.1:6379"
- Redis is not running
- Start Redis with one of the methods above
- Restart your Vaulteer server

---

## Production Deployment

For production, use **AWS ElastiCache** instead of local Redis:

1. Create Redis cluster in AWS ElastiCache
2. Update `.env`:
   ```env
   REDIS_HOST=your-elasticache-endpoint.cache.amazonaws.com
   REDIS_PORT=6379
   ```
3. Restart server

---

## Next Steps

1. **Install Redis** using one of the options above
2. **Restart your Vaulteer server** (it will auto-detect Redis)
3. **Configure AWS credentials** in `.env` for Textract API
4. **Run database migration** to add OCR columns
5. **Test with a filled form**

See **TEXTRACT_SETUP_CHECKLIST.md** for complete setup instructions.
