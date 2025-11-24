# Production Deployment Guide - Vaulteer

**Target Infrastructure:**
- Domain: `vaulteer.kuzaken.tech`
- EC2 Instance: `i-0c9d8cab21ab441b7`
- Public IP: `3.106.82.21` (Elastic IP)
- Region: `ap-southeast-2`
- Instance Type: `t3.small`
- OS: Ubuntu (assumed)

**Architecture:**
- Frontend: Next.js (port 3000)
- Backend: Express.js (port 5000)
- Reverse Proxy: nginx (port 80/443)
- Database: MySQL/MariaDB
- SSL: Let's Encrypt (certbot)

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Server Setup](#initial-server-setup)
3. [Install Dependencies](#install-dependencies)
4. [Database Setup](#database-setup)
5. [Application Setup](#application-setup)
6. [Nginx Configuration](#nginx-configuration)
7. [SSL/TLS Setup](#ssltls-setup)
8. [Process Management](#process-management)
9. [Security Hardening](#security-hardening)
10. [Monitoring & Logging](#monitoring--logging)
11. [Backup Strategy](#backup-strategy)
12. [Deployment Checklist](#deployment-checklist)

---

## Prerequisites

### Local Setup
1. **Rotate Firebase Credentials** (CRITICAL)
   ```bash
   # Your firebase-service-account.json was committed to git with the private key exposed
   # You MUST rotate these credentials before deployment:
   # 1. Go to Firebase Console > Project Settings > Service Accounts
   # 2. Generate a new private key
   # 3. Delete the old service account key
   # 4. Store new credentials in secure location (password manager)
   ```

2. **Prepare Environment Variables**
   ```bash
   # Convert new Firebase credentials to base64
   cat firebase-service-account.json | base64 -w 0 > firebase-base64.txt
   # Save this base64 string - you'll need it for the server
   ```

3. **Clean Git History** (after deployment)
   ```bash
   # Remove committed secrets from git history using BFG or git-filter-repo
   # See: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
   ```

### SSH Access
```bash
# Connect to your EC2 instance
ssh -i your-key.pem ubuntu@3.106.82.21

# Or if DNS is configured
ssh -i your-key.pem ubuntu@vaulteer.kuzaken.tech
```

---

## Initial Server Setup

### 1. Update System Packages
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Set System Timezone
```bash
sudo timedatectl set-timezone Asia/Manila  # Or your timezone
timedatectl status
```

### 3. Configure Firewall
```bash
# Enable UFW firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### 4. Create Application User
```bash
# Create non-root user for running the application
sudo adduser --system --group --home /opt/vaulteer vaulteer
sudo usermod -aG sudo vaulteer  # Optional: if you need sudo access
```

---

## Install Dependencies

### 1. Install Node.js 20.x LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v20.x
npm --version
```

### 2. Install MySQL/MariaDB
```bash
sudo apt install -y mariadb-server mariadb-client
sudo systemctl start mariadb
sudo systemctl enable mariadb

# Secure MySQL installation
sudo mysql_secure_installation
# Set root password: YES
# Remove anonymous users: YES
# Disallow root login remotely: YES
# Remove test database: YES
# Reload privilege tables: YES
```

### 3. Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
nginx -v
```

### 4. Install Certbot (SSL)
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 5. Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
pm2 --version
```

---

## Database Setup

### 1. Create Database and User
```bash
sudo mysql -u root -p
```

```sql
-- Create database
CREATE DATABASE vaulteer_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user with strong password
CREATE USER 'vaulteer_user'@'localhost' IDENTIFIED BY 'YOUR_SECURE_PASSWORD_HERE';

-- Grant privileges
GRANT ALL PRIVILEGES ON vaulteer_db.* TO 'vaulteer_user'@'localhost';
FLUSH PRIVILEGES;

-- Test connection
SELECT user, host FROM mysql.user WHERE user = 'vaulteer_user';

EXIT;
```

### 2. Import Initial Schema
```bash
# Upload your vaulteer_db.sql file to the server
scp -i your-key.pem vaulteer_db.sql ubuntu@3.106.82.21:/tmp/

# Import the schema
mysql -u vaulteer_user -p vaulteer_db < /tmp/vaulteer_db.sql

# Verify tables
mysql -u vaulteer_user -p -e "SHOW TABLES;" vaulteer_db
```

### 3. Configure MySQL for Production
```bash
sudo nano /etc/mysql/mariadb.conf.d/50-server.cnf
```

Add/modify:
```ini
[mysqld]
# Performance tuning
max_connections = 200
connect_timeout = 10
wait_timeout = 300
interactive_timeout = 300

# Character set
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# Security
bind-address = 127.0.0.1  # Only accept local connections
```

Restart MySQL:
```bash
sudo systemctl restart mariadb
```

---

## Application Setup

### 1. Clone Repository
```bash
# Create application directory
sudo mkdir -p /opt/vaulteer
sudo chown -R vaulteer:vaulteer /opt/vaulteer

# Switch to vaulteer user
sudo su - vaulteer

# Clone your repository (using HTTPS or SSH)
cd /opt/vaulteer
git clone https://github.com/yourusername/RedVault.git app
cd app
```

### 2. Install Dependencies

**Backend:**
```bash
cd /opt/vaulteer/app/backend
npm ci --production
```

**Frontend:**
```bash
cd /opt/vaulteer/app/frontend
npm ci --production
npm run build
```

### 3. Configure Backend Environment

```bash
cd /opt/vaulteer/app/backend
nano .env
```

Add the following (replace with your actual values):
```env
NODE_ENV=production
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_USER=vaulteer_user
DB_PASS=YOUR_SECURE_PASSWORD_HERE
DB_NAME=vaulteer_db
DB_CONN_LIMIT=20

# Frontend URL
FRONTEND_URL=https://vaulteer.kuzaken.tech

# Firebase Credentials (use base64-encoded JSON)
FIREBASE_SERVICE_ACCOUNT_BASE64=ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAibXktZmlyZWJhc2UtZWZhN2EiLAog...YOUR_NEW_BASE64_STRING_HERE

# Optional: LAN address (not needed in production)
# LAN_ADDRESS=
```

**Security Note:** Set proper file permissions:
```bash
chmod 600 /opt/vaulteer/app/backend/.env
```

### 4. Configure Frontend Environment

```bash
cd /opt/vaulteer/app/frontend
nano .env.production
```

Add:
```env
NEXT_PUBLIC_API_URL=https://vaulteer.kuzaken.tech/api

# Optional: Enable host-based rewriting if needed
# DASHBOARD_HOST=vaulteer.kuzaken.tech
```

Rebuild frontend with production config:
```bash
npm run build
```

### 5. Test Backend Locally
```bash
cd /opt/vaulteer/app/backend
NODE_ENV=production node server.js
```

You should see:
```
✓ Firebase Admin initialized
✓ DB connected: vaulteer_db @ localhost
🚀 Vaulteer Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Local:   http://localhost:5000
  ...
```

Press `Ctrl+C` to stop. If successful, proceed to process management.

---

## Nginx Configuration

### 1. Create Nginx Server Block

```bash
sudo nano /etc/nginx/sites-available/vaulteer
```

Paste the following configuration:

```nginx
# HTTP server - redirect all traffic to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name vaulteer.kuzaken.tech;

    # Allow certbot challenges
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other HTTP requests to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name vaulteer.kuzaken.tech;

    # SSL certificates (will be configured by certbot)
    ssl_certificate /etc/letsencrypt/live/vaulteer.kuzaken.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vaulteer.kuzaken.tech/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Max upload size
    client_max_body_size 10M;

    # Logging
    access_log /var/log/nginx/vaulteer-access.log;
    error_log /var/log/nginx/vaulteer-error.log;

    # API endpoints - proxy to backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        
        # Preserve client information
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (if needed in future)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffering
        proxy_buffering off;
    }

    # Frontend - proxy to Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support for Next.js HMR (not needed in production, but harmless)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Next.js static files - cache aggressively
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        
        # Cache for 1 year
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Favicon and static assets
    location ~* \.(ico|css|js|gif|jpeg|jpg|png|woff|woff2|ttf|svg|eot)$ {
        proxy_pass http://127.0.0.1:3000;
        expires 7d;
        add_header Cache-Control "public";
    }
}
```

### 2. Enable the Site

```bash
# Test nginx configuration
sudo nginx -t

# If test passes, enable the site
sudo ln -s /etc/nginx/sites-available/vaulteer /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Reload nginx (don't restart yet - SSL not configured)
sudo systemctl reload nginx
```

---

## SSL/TLS Setup

### 1. Obtain SSL Certificate with Certbot

```bash
# Stop nginx temporarily
sudo systemctl stop nginx

# Obtain certificate (standalone mode)
sudo certbot certonly --standalone -d vaulteer.kuzaken.tech --email your-email@example.com --agree-tos --no-eff-email

# You should see:
# Successfully received certificate.
# Certificate is saved at: /etc/letsencrypt/live/vaulteer.kuzaken.tech/fullchain.pem
# Key is saved at:         /etc/letsencrypt/live/vaulteer.kuzaken.tech/privkey.pem
```

### 2. Start Nginx

```bash
sudo systemctl start nginx
sudo systemctl status nginx
```

### 3. Configure Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically installs a cron job for renewal
# Verify it's present
sudo systemctl list-timers | grep certbot
```

### 4. Setup Renewal Hook (Optional)

Create a renewal hook to reload nginx after certificate renewal:

```bash
sudo nano /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

Add:
```bash
#!/bin/bash
systemctl reload nginx
```

Make executable:
```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

---

## Process Management

### Option A: Using PM2 (Recommended)

#### 1. Create PM2 Ecosystem File

```bash
cd /opt/vaulteer/app
nano ecosystem.config.js
```

Add:
```javascript
module.exports = {
  apps: [
    {
      name: "vaulteer-backend",
      cwd: "/opt/vaulteer/app/backend",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      error_file: "/var/log/vaulteer/backend-error.log",
      out_file: "/var/log/vaulteer/backend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 4000,
    },
    {
      name: "vaulteer-frontend",
      cwd: "/opt/vaulteer/app/frontend",
      script: "node_modules/.bin/next",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/var/log/vaulteer/frontend-error.log",
      out_file: "/var/log/vaulteer/frontend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 4000,
    },
  ],
};
```

#### 2. Create Log Directory

```bash
sudo mkdir -p /var/log/vaulteer
sudo chown -R vaulteer:vaulteer /var/log/vaulteer
```

#### 3. Start Applications with PM2

```bash
# Switch to vaulteer user
sudo su - vaulteer
cd /opt/vaulteer/app

# Start applications
pm2 start ecosystem.config.js

# Check status
pm2 status
pm2 logs

# Save PM2 configuration
pm2 save
```

#### 4. Setup PM2 Startup Script

```bash
# Exit vaulteer user first
exit

# Generate startup script (as root/sudo)
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u vaulteer --hp /opt/vaulteer

# This will create a systemd service for PM2
sudo systemctl enable pm2-vaulteer
sudo systemctl start pm2-vaulteer
sudo systemctl status pm2-vaulteer
```

#### 5. PM2 Management Commands

```bash
# View logs
pm2 logs
pm2 logs vaulteer-backend
pm2 logs vaulteer-frontend

# Restart applications
pm2 restart all
pm2 restart vaulteer-backend

# Stop applications
pm2 stop all

# Monitor resource usage
pm2 monit
```

---

### Option B: Using Systemd Services

If you prefer systemd over PM2:

#### Backend Service

```bash
sudo nano /etc/systemd/system/vaulteer-backend.service
```

```ini
[Unit]
Description=Vaulteer Backend API
After=network.target mariadb.service
Wants=mariadb.service

[Service]
Type=simple
User=vaulteer
Group=vaulteer
WorkingDirectory=/opt/vaulteer/app/backend
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/vaulteer/backend.log
StandardError=append:/var/log/vaulteer/backend-error.log

[Install]
WantedBy=multi-user.target
```

#### Frontend Service

```bash
sudo nano /etc/systemd/system/vaulteer-frontend.service
```

```ini
[Unit]
Description=Vaulteer Frontend (Next.js)
After=network.target vaulteer-backend.service
Wants=vaulteer-backend.service

[Service]
Type=simple
User=vaulteer
Group=vaulteer
WorkingDirectory=/opt/vaulteer/app/frontend
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/usr/bin/npx next start
Restart=always
RestartSec=10
StandardOutput=append:/var/log/vaulteer/frontend.log
StandardError=append:/var/log/vaulteer/frontend-error.log

[Install]
WantedBy=multi-user.target
```

#### Enable and Start Services

```bash
# Create log directory
sudo mkdir -p /var/log/vaulteer
sudo chown -R vaulteer:vaulteer /var/log/vaulteer

# Reload systemd
sudo systemctl daemon-reload

# Enable services
sudo systemctl enable vaulteer-backend
sudo systemctl enable vaulteer-frontend

# Start services
sudo systemctl start vaulteer-backend
sudo systemctl start vaulteer-frontend

# Check status
sudo systemctl status vaulteer-backend
sudo systemctl status vaulteer-frontend

# View logs
sudo journalctl -u vaulteer-backend -f
sudo journalctl -u vaulteer-frontend -f
```

---

## Security Hardening

### 1. Secure SSH Access

```bash
sudo nano /etc/ssh/sshd_config
```

Ensure these settings:
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
X11Forwarding no
```

Restart SSH:
```bash
sudo systemctl restart sshd
```

### 2. Configure Fail2Ban (Brute Force Protection)

```bash
sudo apt install -y fail2ban

# Create local configuration
sudo nano /etc/fail2ban/jail.local
```

Add:
```ini
[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 5
bantime = 3600

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/vaulteer-error.log
maxretry = 5
bantime = 3600
```

Start fail2ban:
```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
sudo fail2ban-client status
```

### 3. Secure MySQL

```bash
# Restrict MySQL to local connections only
sudo nano /etc/mysql/mariadb.conf.d/50-server.cnf
```

Ensure:
```ini
bind-address = 127.0.0.1
```

Restart MySQL:
```bash
sudo systemctl restart mariadb
```

### 4. Set File Permissions

```bash
# Application directory
sudo chown -R vaulteer:vaulteer /opt/vaulteer/app
sudo chmod -R 750 /opt/vaulteer/app

# Environment files (sensitive)
sudo chmod 600 /opt/vaulteer/app/backend/.env
sudo chmod 600 /opt/vaulteer/app/frontend/.env.production

# Log directory
sudo chmod -R 750 /var/log/vaulteer
```

### 5. Remove Firebase Service Account File

```bash
# After confirming env vars work, delete the file
rm /opt/vaulteer/app/backend/firebase-service-account.json

# Verify it's gone
ls -la /opt/vaulteer/app/backend/firebase-service-account.json
```

### 6. Enable Automatic Security Updates

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## Monitoring & Logging

### 1. Setup Log Rotation

```bash
sudo nano /etc/logrotate.d/vaulteer
```

Add:
```
/var/log/vaulteer/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 vaulteer vaulteer
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 2. Monitor Disk Space

```bash
# Check current usage
df -h

# Setup alert for low disk space (optional)
sudo apt install -y smartmontools
```

### 3. Monitor Application Health

Create a simple health check script:

```bash
sudo nano /opt/vaulteer/scripts/health-check.sh
```

Add:
```bash
#!/bin/bash

BACKEND_URL="http://localhost:5000/api/health"
FRONTEND_URL="http://localhost:3000"
LOG_FILE="/var/log/vaulteer/health-check.log"

echo "[$(date)] Starting health check..." >> $LOG_FILE

# Check backend
if curl -sf "$BACKEND_URL" > /dev/null; then
    echo "[$(date)] Backend: OK" >> $LOG_FILE
else
    echo "[$(date)] Backend: FAILED" >> $LOG_FILE
    # Send alert (implement email/SMS notification)
fi

# Check frontend
if curl -sf "$FRONTEND_URL" > /dev/null; then
    echo "[$(date)] Frontend: OK" >> $LOG_FILE
else
    echo "[$(date)] Frontend: FAILED" >> $LOG_FILE
    # Send alert
fi
```

Make executable:
```bash
sudo chmod +x /opt/vaulteer/scripts/health-check.sh
```

Add to crontab:
```bash
sudo crontab -e
```

Add:
```
*/5 * * * * /opt/vaulteer/scripts/health-check.sh
```

### 4. Setup CloudWatch Logs (Optional - AWS)

If you want centralized logging:

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure CloudWatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

---

## Backup Strategy

### 1. Database Backup Script

```bash
sudo mkdir -p /opt/vaulteer/backups
sudo nano /opt/vaulteer/scripts/backup-db.sh
```

Add:
```bash
#!/bin/bash

BACKUP_DIR="/opt/vaulteer/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/vaulteer_db_$TIMESTAMP.sql.gz"
DB_NAME="vaulteer_db"
DB_USER="vaulteer_user"
DB_PASS="YOUR_SECURE_PASSWORD_HERE"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Dump database and compress
mysqldump -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" | gzip > "$BACKUP_FILE"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "vaulteer_db_*.sql.gz" -mtime +7 -delete

echo "[$(date)] Database backup completed: $BACKUP_FILE"
```

Make executable:
```bash
sudo chmod +x /opt/vaulteer/scripts/backup-db.sh
sudo chmod 700 /opt/vaulteer/scripts/backup-db.sh  # Secure (contains password)
```

Add to crontab (daily at 2 AM):
```bash
sudo crontab -e
```

Add:
```
0 2 * * * /opt/vaulteer/scripts/backup-db.sh >> /var/log/vaulteer/backup.log 2>&1
```

### 2. Application Backup

```bash
sudo nano /opt/vaulteer/scripts/backup-app.sh
```

Add:
```bash
#!/bin/bash

BACKUP_DIR="/opt/vaulteer/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
APP_DIR="/opt/vaulteer/app"
BACKUP_FILE="$BACKUP_DIR/app_$TIMESTAMP.tar.gz"

# Backup application (exclude node_modules and .next)
tar -czf "$BACKUP_FILE" \
    --exclude="node_modules" \
    --exclude=".next" \
    --exclude=".git" \
    -C /opt/vaulteer app

# Keep only last 7 days
find "$BACKUP_DIR" -name "app_*.tar.gz" -mtime +7 -delete

echo "[$(date)] Application backup completed: $BACKUP_FILE"
```

Make executable:
```bash
sudo chmod +x /opt/vaulteer/scripts/backup-app.sh
```

### 3. Backup to S3 (Optional)

```bash
# Install AWS CLI
sudo apt install -y awscli

# Configure AWS credentials
sudo -u vaulteer aws configure
```

Update backup scripts to sync to S3:
```bash
# Add to end of backup-db.sh
aws s3 cp "$BACKUP_FILE" s3://your-backup-bucket/vaulteer/db/

# Add to end of backup-app.sh
aws s3 cp "$BACKUP_FILE" s3://your-backup-bucket/vaulteer/app/
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Rotate Firebase service account credentials
- [ ] Generate new base64-encoded Firebase credentials
- [ ] Prepare strong MySQL password
- [ ] Ensure DNS A record points to 3.106.82.21
- [ ] Have SSH key ready for EC2 access

### Server Setup

- [ ] Connect to EC2 instance via SSH
- [ ] Update system packages (`apt update && apt upgrade`)
- [ ] Configure firewall (UFW)
- [ ] Set system timezone
- [ ] Create vaulteer system user

### Dependencies

- [ ] Install Node.js 20.x
- [ ] Install MySQL/MariaDB
- [ ] Install Nginx
- [ ] Install Certbot
- [ ] Install PM2 or configure systemd

### Database

- [ ] Run `mysql_secure_installation`
- [ ] Create vaulteer_db database
- [ ] Create vaulteer_user with strong password
- [ ] Import database schema
- [ ] Configure MySQL production settings
- [ ] Verify tables exist

### Application

- [ ] Clone repository to /opt/vaulteer/app
- [ ] Install backend dependencies (`npm ci --production`)
- [ ] Install frontend dependencies (`npm ci --production`)
- [ ] Configure backend .env file
- [ ] Configure frontend .env.production
- [ ] Build frontend (`npm run build`)
- [ ] Test backend locally (check Firebase init, DB connection)
- [ ] Set proper file permissions (chmod 600 on .env files)

### Nginx

- [ ] Create /etc/nginx/sites-available/vaulteer config
- [ ] Test nginx config (`nginx -t`)
- [ ] Enable site (symlink to sites-enabled)
- [ ] Remove default site

### SSL/TLS

- [ ] Obtain SSL certificate with certbot
- [ ] Verify certificate files exist
- [ ] Start nginx
- [ ] Test auto-renewal (`certbot renew --dry-run`)

### Process Management

- [ ] Create PM2 ecosystem.config.js OR systemd service files
- [ ] Create log directory (/var/log/vaulteer)
- [ ] Start applications (PM2 or systemd)
- [ ] Verify both services running
- [ ] Setup PM2 startup script OR enable systemd services
- [ ] Test application restart after reboot

### Security

- [ ] Configure SSH (disable root login, password auth)
- [ ] Install and configure fail2ban
- [ ] Verify MySQL bind-address (127.0.0.1)
- [ ] Set proper file permissions (750 for app, 600 for .env)
- [ ] Remove firebase-service-account.json file
- [ ] Enable automatic security updates
- [ ] Configure firewall rules (UFW)

### Monitoring

- [ ] Setup log rotation (/etc/logrotate.d/vaulteer)
- [ ] Create health check script
- [ ] Add health check to crontab
- [ ] Verify logs are being written
- [ ] Setup CloudWatch (optional)

### Backups

- [ ] Create backup scripts (database + application)
- [ ] Test backup scripts manually
- [ ] Add backup scripts to crontab
- [ ] Setup S3 sync (optional)
- [ ] Verify backups are created

### Validation

- [ ] Visit https://vaulteer.kuzaken.tech (should load without errors)
- [ ] Check SSL certificate (green padlock in browser)
- [ ] Test API endpoint: https://vaulteer.kuzaken.tech/api/health
- [ ] Test user authentication (login/logout)
- [ ] Monitor logs for errors (`pm2 logs` or `journalctl`)
- [ ] Verify scheduled jobs are running (cron)
- [ ] Test application restart (`pm2 restart all`)
- [ ] Check disk space (`df -h`)
- [ ] Verify security headers (use securityheaders.com)

### Post-Deployment

- [ ] Monitor application for 24-48 hours
- [ ] Check error logs daily
- [ ] Verify backups are running
- [ ] Document any custom configurations
- [ ] Clean git history to remove committed secrets
- [ ] Update README with deployment info
- [ ] Setup monitoring alerts (email/SMS)

---

## Common Issues & Troubleshooting

### Issue: nginx fails to start after SSL config

**Solution:**
```bash
# Check nginx error log
sudo tail -f /var/log/nginx/error.log

# Common causes:
# 1. SSL certificate files don't exist yet
# 2. Certificate paths are wrong
# 3. Port 443 already in use

# Test nginx config
sudo nginx -t
```

### Issue: Backend can't connect to database

**Solution:**
```bash
# Check MySQL is running
sudo systemctl status mariadb

# Test connection manually
mysql -u vaulteer_user -p vaulteer_db

# Check backend logs
pm2 logs vaulteer-backend

# Common causes:
# 1. Wrong DB_PASS in .env
# 2. MySQL user doesn't have permissions
# 3. MySQL not accepting connections on localhost
```

### Issue: Frontend shows 502 Bad Gateway

**Solution:**
```bash
# Check if Next.js is running
pm2 status
curl http://localhost:3000

# Check nginx error log
sudo tail -f /var/log/nginx/vaulteer-error.log

# Restart frontend
pm2 restart vaulteer-frontend
```

### Issue: Rate limiting too aggressive

**Solution:**
```bash
# Edit backend/middleware/rateLimiter.js
# Adjust `max` and `windowMs` values
# Restart backend
pm2 restart vaulteer-backend
```

### Issue: Firebase authentication fails

**Solution:**
```bash
# Check backend logs
pm2 logs vaulteer-backend | grep Firebase

# Common causes:
# 1. FIREBASE_SERVICE_ACCOUNT_BASE64 not set or wrong
# 2. Base64 decoding failed
# 3. Service account revoked/expired

# Test Firebase credentials
cd /opt/vaulteer/app/backend
node -e "console.log(JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString()))"
```

---

## Deployment Commands Quick Reference

```bash
# SSH to server
ssh -i your-key.pem ubuntu@vaulteer.kuzaken.tech

# Check application status
pm2 status
pm2 logs

# Restart applications
pm2 restart all

# View nginx logs
sudo tail -f /var/log/nginx/vaulteer-access.log
sudo tail -f /var/log/nginx/vaulteer-error.log

# Check SSL certificate expiry
sudo certbot certificates

# Renew SSL certificate manually
sudo certbot renew

# Check disk space
df -h

# Check memory usage
free -h

# Check running processes
ps aux | grep node

# Database backup (manual)
sudo /opt/vaulteer/scripts/backup-db.sh

# Check firewall status
sudo ufw status

# View fail2ban status
sudo fail2ban-client status
```

---

## Update/Deployment Process

When deploying updates:

```bash
# 1. SSH to server
ssh -i your-key.pem ubuntu@vaulteer.kuzaken.tech

# 2. Switch to vaulteer user
sudo su - vaulteer

# 3. Navigate to app directory
cd /opt/vaulteer/app

# 4. Backup current version (optional)
cd /opt/vaulteer
tar -czf app-backup-$(date +%Y%m%d).tar.gz app/

# 5. Pull latest changes
cd /opt/vaulteer/app
git pull origin main

# 6. Install dependencies (if package.json changed)
cd backend && npm ci --production
cd ../frontend && npm ci --production

# 7. Build frontend (if code changed)
cd /opt/vaulteer/app/frontend
npm run build

# 8. Run database migrations (if any)
cd /opt/vaulteer/app/backend
# Add migration commands here if needed

# 9. Restart applications
pm2 restart all

# 10. Monitor logs for errors
pm2 logs --lines 50

# 11. Test the application
curl https://vaulteer.kuzaken.tech/api/health
```

---

## Security Incident Response

If you suspect a security breach:

1. **Immediately rotate all credentials:**
   ```bash
   # Database password
   mysql -u root -p
   ALTER USER 'vaulteer_user'@'localhost' IDENTIFIED BY 'NEW_STRONG_PASSWORD';
   
   # Update .env file with new password
   
   # Firebase service account (regenerate in Firebase Console)
   ```

2. **Check access logs:**
   ```bash
   sudo tail -1000 /var/log/nginx/vaulteer-access.log | grep -i "POST\|PUT\|DELETE"
   sudo tail -1000 /var/log/auth.log | grep -i "accepted\|failed"
   ```

3. **Review fail2ban bans:**
   ```bash
   sudo fail2ban-client status sshd
   sudo fail2ban-client status nginx-http-auth
   ```

4. **Block suspicious IPs:**
   ```bash
   sudo ufw deny from SUSPICIOUS_IP
   ```

5. **Audit database for unauthorized changes:**
   ```sql
   SELECT * FROM users WHERE updated_at > '2024-01-01' ORDER BY updated_at DESC;
   ```

---

## Support & Resources

- **Next.js Documentation:** https://nextjs.org/docs
- **Express.js Best Practices:** https://expressjs.com/en/advanced/best-practice-security.html
- **Nginx Documentation:** https://nginx.org/en/docs/
- **PM2 Documentation:** https://pm2.keymetrics.io/docs/usage/quick-start/
- **Let's Encrypt:** https://letsencrypt.org/docs/
- **Firebase Admin SDK:** https://firebase.google.com/docs/admin/setup
- **MySQL Security:** https://dev.mysql.com/doc/refman/8.0/en/security.html

---

**Last Updated:** January 2025  
**Deployment Target:** vaulteer.kuzaken.tech (3.106.82.21)  
**Maintainer:** Your Name/Team
