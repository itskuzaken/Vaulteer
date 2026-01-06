#!/bin/bash
# deploy-pm2.sh - Proper deployment script for PM2 with Redis startup order

set -e

echo "🚀 Starting Vaulteer Deployment with PM2..."

# Stop all existing processes
echo "⏸️  Stopping existing PM2 processes..."
pm2 stop all || true

# Delete old processes (clean slate)
echo "🗑️  Removing old PM2 processes..."
pm2 delete all || true

# Start Redis FIRST
echo "📡 Starting Redis..."
pm2 start ecosystem.config.js --only vaulteer-redis

# Wait for Redis to be ready (max 10 seconds)
echo "⏳ Waiting for Redis to be ready..."
for i in {1..10}; do
  if redis-cli -h 127.0.0.1 -p 6379 ping > /dev/null 2>&1; then
    echo "✅ Redis is ready!"
    break
  fi
  if [ $i -eq 10 ]; then
    echo "❌ Redis failed to start after 10 seconds"
    pm2 logs vaulteer-redis --lines 20 --nostream
    exit 1
  fi
  echo "   Attempt $i/10..."
  sleep 1
done

# Start Backend (now that Redis is ready)
echo "🔧 Starting Backend..."
pm2 start ecosystem.config.js --only vaulteer-backend

# Wait 3 seconds for backend to initialize
sleep 3

# Start Frontend
echo "🎨 Starting Frontend..."
pm2 start ecosystem.config.js --only vaulteer-frontend

# Save PM2 process list for auto-restart on reboot
echo "💾 Saving PM2 process list..."
pm2 save

# Setup PM2 startup script (only needs to be done once, but safe to repeat)
echo "🔄 Setting up PM2 startup script..."
pm2 startup systemd -u ubuntu --hp /home/ubuntu | grep -v "PM2" | bash || true

# Show status
echo ""
echo "✅ Deployment Complete!"
echo ""
pm2 status

echo ""
echo "📊 Checking logs..."
echo ""
pm2 logs --lines 10 --nostream

echo ""
echo "🎉 All services started successfully!"
echo ""
echo "Monitor logs with: pm2 logs"
echo "Check status with: pm2 status"
echo "Restart all with: pm2 restart all"
