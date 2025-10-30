# Vaulteer AWS EC2 Deployment Guide

## 🚀 Quick Deployment

### Prerequisites
- SSH access to your EC2 instance
- Firebase service account JSON file
- Database already configured (RDS)

### One-Command Deployment

1. **Connect to your EC2 instance:**
   ```bash
   ssh -i your-key.pem ubuntu@54.206.138.130
   ```

2. **Download and run the deployment script:**
   ```bash
   wget https://raw.githubusercontent.com/itskuzaken/Vaulteer/main/deploy-to-ec2.sh
   chmod +x deploy-to-ec2.sh
   ./deploy-to-ec2.sh
   ```

3. **Upload Firebase credentials:**
   ```bash
   # From your local machine
   scp firebase-service-account.json ubuntu@54.206.138.130:/var/www/vaulteer/backend/
   ```

4. **Update Firebase config on the server:**
   ```bash
   # SSH into server and edit
   sudo nano /var/www/vaulteer/frontend/.env.local
   ```

## 📋 Manual Step-by-Step Deployment

If you prefer manual deployment, follow these steps:

### Step 1: System Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 and Nginx
sudo npm install -g pm2 pm2-logrotate
sudo apt install -y nginx

# Configure firewall
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
```

### Step 2: Clone Repository
```bash
sudo mkdir -p /var/www/vaulteer
sudo chown -R $USER:$USER /var/www/vaulteer
cd /var/www/vaulteer
git clone https://github.com/itskuzaken/Vaulteer.git .
```

### Step 3: Install Dependencies
```bash
# Backend
cd backend
npm install --production

# Frontend
cd ../frontend
npm install
npm run build
cd ..
```

### Step 4: Configure Environment

#### Backend (.env)
```bash
NODE_ENV=production
PORT=3001
DB_HOST=vaulteer-db.c7csay8a2c32.ap-southeast-2.rds.amazonaws.com
DB_USER=admin
DB_PASS=vaulteer123
DB_NAME=vaulteer_db
DB_CONN_LIMIT=10
FRONTEND_URL=http://54.206.138.130
FIREBASE_SERVICE_ACCOUNT=./firebase-service-account.json
```

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_BASE=http://localhost:3001/api
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Step 5: Configure Nginx

Create `/etc/nginx/sites-available/vaulteer`:

```nginx
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
```

Enable the site:
```bash
sudo ln -sf /etc/nginx/sites-available/vaulteer /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl enable nginx
```

### Step 6: Start Applications

```bash
cd /var/www/vaulteer

# Start backend
cd backend
pm2 start server.js --name vaulteer-backend

# Start frontend
cd frontend
pm2 start npm --name vaulteer-frontend -- start

# Configure auto-startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
pm2 save

# Setup log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

## 🔍 Verification Steps

After deployment, verify everything works:

```bash
# Check PM2 status
pm2 status

# Test backend
curl http://localhost:3001/api/health

# Test frontend
curl -I http://localhost:3000

# Test through Nginx
curl http://54.206.138.130/health
curl http://54.206.138.130/api/health
```

## 🔄 Updating & Redeploying

When you make code changes:

```bash
# On your EC2 instance
cd /var/www/vaulteer

# Pull latest changes
git pull origin main

# Update backend
cd backend
npm install --production
pm2 restart vaulteer-backend

# Update frontend
cd ../frontend
npm install
npm run build
pm2 restart vaulteer-frontend

# Reload Nginx if config changed
sudo nginx -t && sudo systemctl reload nginx
```

## 🔒 Security & SSL Setup

### Optional: HTTPS with Certbot

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (requires domain)
sudo certbot --nginx -d your-domain.com

# Update environment variables for HTTPS
# Change FRONTEND_URL in backend/.env to https://your-domain.com
```

### Security Best Practices

1. **Regular updates:** `sudo apt update && sudo apt upgrade`
2. **Monitor logs:** `pm2 logs` and `/var/log/nginx/`
3. **Backup database:** Set up RDS automated backups
4. **Environment variables:** Never commit secrets to git
5. **Firewall:** Keep UFW enabled and minimal

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts:**
   ```bash
   sudo netstat -tlnp | grep :300
   sudo lsof -i :3000
   sudo lsof -i :3001
   ```

2. **Nginx errors:**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Application crashes:**
   ```bash
   pm2 logs vaulteer-backend
   pm2 logs vaulteer-frontend
   ```

4. **Database connection issues:**
   - Check RDS security group allows EC2 instance
   - Verify credentials in backend/.env

5. **CORS errors:**
   - Check Nginx CORS headers
   - Verify FRONTEND_URL in backend/.env

### Logs and Monitoring

```bash
# PM2 logs
pm2 logs
pm2 logs vaulteer-backend --lines 50
pm2 logs vaulteer-frontend --lines 50

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System monitoring
htop
df -h
free -h
```

## 📊 Performance Optimization

### PM2 Configuration
```bash
# Set memory limits
pm2 set vaulteer-backend max_memory_restart 500M
pm2 set vaulteer-frontend max_memory_restart 800M

# Auto restart on crashes
pm2 set vaulteer-backend autorestart true
pm2 set vaulteer-frontend autorestart true
```

### Nginx Optimization
- Gzip compression enabled
- Static file caching configured
- Security headers added

## 🎯 URLs After Deployment

- **Frontend:** http://54.206.138.130
- **Backend API:** http://54.206.138.130/api
- **Health Check:** http://54.206.138.130/health
- **PM2 Dashboard:** Access via `pm2 monit`

## 📞 Support

If you encounter issues:
1. Check the logs using commands above
2. Verify all environment variables
3. Test individual components
4. Check AWS service status
5. Review security groups and firewall rules