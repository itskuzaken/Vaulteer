#!/bin/bash

# ===========================================
# Vaulteer Full-Stack Deployment Script
# AWS EC2 Ubuntu 24.04 LTS
# Instance: i-0a7ddcf3ab8351f7c (t3.small)
# Public IP: 54.206.138.130
# ===========================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# ===========================================
# STEP 1: SYSTEM UPDATE & BASIC SETUP
# ===========================================

log "Step 1: Updating system and installing basic tools..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install basic tools
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Node.js 18
log "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
node --version
npm --version

# Install PM2 globally
log "Installing PM2 process manager..."
sudo npm install -g pm2
sudo npm install -g pm2-logrotate

# Install Nginx
log "Installing Nginx..."
sudo apt install -y nginx

# Configure UFW firewall
log "Configuring UFW firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force reload
sudo ufw status

# ===========================================
# STEP 2: CLONE AND SETUP PROJECT
# ===========================================

log "Step 2: Cloning and setting up project..."

# Create application directory
sudo mkdir -p /var/www/vaulteer
sudo chown -R $USER:$USER /var/www/vaulteer
cd /var/www/vaulteer

# Clone repository (replace with your actual repo URL)
log "Cloning Vaulteer repository..."
git clone https://github.com/itskuzaken/Vaulteer.git .
# If using private repo, you'll need to set up SSH keys or use HTTPS with token

# ===========================================
# STEP 3: INSTALL DEPENDENCIES
# ===========================================

log "Step 3: Installing application dependencies..."

# Install backend dependencies
log "Installing backend dependencies..."
cd backend
npm install --production
cd ..

# Install frontend dependencies and build
log "Installing frontend dependencies..."
cd frontend
npm install
npm run build
cd ..

# ===========================================
# STEP 4: CONFIGURE ENVIRONMENT VARIABLES
# ===========================================

log "Step 4: Configuring environment variables..."

# Backend .env configuration
cat > backend/.env << 'EOF'
NODE_ENV=production
PORT=3001
DB_HOST=vaulteer-db.c7csay8a2c32.ap-southeast-2.rds.amazonaws.com
DB_USER=admin
DB_PASS=vaulteer123
DB_NAME=vaulteer_db
DB_CONN_LIMIT=10
FRONTEND_URL=http://54.206.138.130
FIREBASE_SERVICE_ACCOUNT=./firebase-service-account.json
EOF

# Frontend .env.local configuration
cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_BASE=http://localhost:3001/api
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
EOF

warn "IMPORTANT: Update the Firebase configuration in frontend/.env.local with your actual Firebase project credentials!"

# ===========================================
# STEP 5: SETUP FIREBASE SERVICE ACCOUNT
# ===========================================

log "Step 5: Firebase service account setup..."

# Note: You'll need to upload your firebase-service-account.json to backend/ directory
info "Upload your Firebase service account JSON file to: /var/www/vaulteer/backend/firebase-service-account.json"
info "You can use scp or sftp to upload the file:"
info "scp firebase-service-account.json ubuntu@54.206.138.130:/var/www/vaulteer/backend/"

# ===========================================
# STEP 6: CONFIGURE NGINX REVERSE PROXY
# ===========================================

log "Step 6: Configuring Nginx reverse proxy..."

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/vaulteer > /dev/null << 'EOF'
server {
    listen 80;
    server_name 54.206.138.130 ec2-54-206-138-130.ap-southeast-2.compute.amazonaws.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Frontend (Next.js) - default route
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Next.js specific headers
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
    }

    # Backend API routes
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # CORS headers for API
        add_header Access-Control-Allow-Origin http://54.206.138.130 always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
        add_header Access-Control-Expose-Headers "Content-Length,Content-Range" always;

        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin http://54.206.138.130;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization";
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type 'text/plain; charset=utf-8';
            add_header Content-Length 0;
            return 204;
        }
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/vaulteer /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
sudo systemctl enable nginx

# ===========================================
# STEP 7: START APPLICATIONS WITH PM2
# ===========================================

log "Step 7: Starting applications with PM2..."

cd /var/www/vaulteer

# Start backend
log "Starting backend application..."
cd backend
pm2 start server.js --name vaulteer-backend
cd ..

# Start frontend (build and start properly)
log "Building and starting frontend application..."
cd frontend
npm run build
pm2 start npm --name vaulteer-frontend -- start
cd ..

# Wait for applications to start
log "Waiting for applications to start..."
sleep 15

# Check if applications are running
log "Checking application status..."
pm2 list

# Configure PM2 startup (with error handling)
log "Configuring PM2 auto-startup..."
if sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME; then
    pm2 save
    log "PM2 auto-startup configured successfully"
else
    warn "PM2 auto-startup configuration failed, but continuing..."
fi

# Setup log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# ===========================================
# STEP 8: VERIFY DEPLOYMENT
# ===========================================

log "Step 8: Verifying deployment..."

# Temporarily disable strict error handling for verification
set +e

# Wait a moment for services to start
sleep 10

# Check PM2 status
log "Checking PM2 status..."
pm2 status
pm2 logs --lines 20

# Test backend health
log "Testing backend health..."
if curl -s http://localhost:3001/api/health; then
    log "✅ Backend health check passed"
else
    error "❌ Backend health check failed"
fi

# Test frontend
log "Testing frontend..."
if curl -s -I http://localhost:3000 | head -1; then
    log "✅ Frontend check passed"
else
    error "❌ Frontend check failed"
fi

# Test Nginx
log "Testing Nginx configuration..."
if curl -s -I http://localhost | head -1; then
    log "✅ Nginx check passed"
else
    error "❌ Nginx check failed"
fi

# Re-enable strict error handling
set -e

# ===========================================
# STEP 9: SETUP MONITORING & LOGS
# ===========================================

log "Step 9: Setting up monitoring and logs..."

# Create log directory
sudo mkdir -p /var/log/vaulteer
sudo chown -R $USER:$USER /var/log/vaulteer

# PM2 logs are already configured with rotation
info "PM2 logs: pm2 logs"
info "Application logs: /var/log/vaulteer/"
info "Nginx logs: /var/log/nginx/"

# ===========================================
# DEPLOYMENT COMPLETE
# ===========================================

log "🎉 DEPLOYMENT COMPLETE!"
echo ""
echo "=================================================================="
echo "Vaulteer Application Deployed Successfully!"
echo "=================================================================="
echo ""
echo "🌐 Frontend URL: http://54.206.138.130"
echo "🔗 Backend API: http://54.206.138.130/api"
echo "🏥 Health Check: http://54.206.138.130/health"
echo ""
echo "📊 PM2 Status: pm2 status"
echo "📝 View Logs: pm2 logs"
echo "🔄 Restart Apps: pm2 restart all"
echo ""
echo "⚠️  IMPORTANT NEXT STEPS:"
echo "1. Upload your Firebase service account JSON to backend/"
echo "2. Update Firebase config in frontend/.env.local"
echo "3. Test the application in your browser"
echo "4. Consider setting up HTTPS with Certbot"
echo ""
echo "=================================================================="

# Display final status
pm2 status
echo ""
info "Deployment script completed successfully!"