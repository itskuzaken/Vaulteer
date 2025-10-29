# AWS Single Instance Deployment Guide

This guide explains how to deploy both the Vaulteer frontend and backend on a single AWS EC2 instance for cost-effective hosting.

## Overview

Running both services on a single EC2 instance is possible and suitable for development, testing, or small-scale production environments. The backend will run on port 3001 and the frontend on port 3000, with Nginx acting as a reverse proxy.

## Architecture

```
Internet → Nginx (Port 80/443) → Frontend (Port 3000) & Backend (Port 3001)
                                      ↓
                                 MySQL Database (RDS)
```

## Prerequisites

- AWS Account with EC2, RDS, and VPC access
- Firebase project with authentication enabled
- Domain name (optional but recommended for HTTPS)
- SSH key pair for EC2 access

## Step 1: Launch EC2 Instance

1. **Create EC2 Instance**

   ```bash
   aws ec2 run-instances \
     --image-id ami-0abcdef1234567890 \
     --instance-type t3.medium \
     --key-name your-key-pair \
     --security-groups vaulteer-sg \
     --subnet-id your-subnet-id \
     --associate-public-ip-address \
     --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=Vaulteer-App}]'
   ```

2. **Security Group Configuration**
   - Allow SSH (22) from your IP
   - Allow HTTP (80) and HTTPS (443) from anywhere
   - Allow MySQL (3306) from your EC2 instance (for RDS access)

## Step 2: Set Up Database (AWS RDS)

1. **Create RDS MySQL Instance**

   ```bash
   aws rds create-db-instance \
     --db-instance-identifier vaulteer-db \
     --db-instance-class db.t3.micro \
     --engine mysql \
     --engine-version 8.0 \
     --master-username vaulteer_admin \
     --master-user-password your_secure_password \
     --allocated-storage 20 \
     --vpc-security-group-ids your-db-sg-id \
     --db-subnet-group-name your-db-subnet-group \
     --backup-retention-period 7 \
     --multi-az
   ```

2. **Note the RDS endpoint** (e.g., `vaulteer-db.xxxxx.rds.amazonaws.com`)

## Step 3: Connect to EC2 Instance

```bash
ssh -i your-key.pem ec2-user@your-instance-public-ip
```

## Step 4: Install Dependencies

1. **Update system packages**

   ```bash
   sudo yum update -y
   ```

2. **Install Node.js 18**

   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install 18
   nvm use 18
   nvm alias default 18
   ```

3. **Install Nginx**

   ```bash
   sudo amazon-linux-extras install nginx1 -y
   sudo systemctl enable nginx
   ```

4. **Install Git**

   ```bash
   sudo yum install git -y
   ```

5. **Install PM2 for process management**
   ```bash
   npm install -g pm2
   ```

## Step 5: Clone and Configure Application

1. **Clone the repository**

   ```bash
   git clone https://github.com/itskuzaken/Vaulteer.git
   cd Vaulteer
   ```

2. **Install backend dependencies**

   ```bash
   cd backend
   npm install --production
   cd ..
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   npm run build
   cd ..
   ```

## Step 6: Configure Environment Variables

1. **Backend configuration**

   ```bash
   cd backend
   cp .env.example .env
   nano .env
   ```

   Add the following to `backend/.env`:

   ```env
   NODE_ENV=production
   PORT=3001
   DB_HOST=your-rds-endpoint.rds.amazonaws.com
   DB_USER=vaulteer_admin
   DB_PASS=your_secure_password
   DB_NAME=vaulteer_db
   DB_CONN_LIMIT=10
   FRONTEND_URL=http://localhost:3000
   FIREBASE_SERVICE_ACCOUNT=./firebase-service-account.json
   ```

2. **Frontend configuration**

   ```bash
   cd frontend
   nano .env.local
   ```

   Add the following to `frontend/.env.local`:

   ```env
   NEXT_PUBLIC_API_BASE=http://localhost:3001/api
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

## Step 7: Set Up Firebase

1. **Upload Firebase service account key**
   - Download `firebase-service-account.json` from Firebase Console
   - Upload it to your EC2 instance: `backend/firebase-service-account.json`

## Step 8: Initialize Database

1. **Connect to RDS and run schema**
   ```bash
   mysql -h your-rds-endpoint.rds.amazonaws.com -u vaulteer_admin -p vaulteer_db < backend/schema.sql
   ```

## Step 9: Configure Nginx

1. **Create Nginx configuration**

   ```bash
   sudo nano /etc/nginx/conf.d/vaulteer.conf
   ```

   Add the following configuration:

   ```nginx
   server {
       listen 80;
       server_name your-domain.com www.your-domain.com;

       # Frontend (Next.js)
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
       }

       # Backend API
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
       }
   }
   ```

2. **Test and reload Nginx**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## Step 10: Start Applications with PM2

1. **Start backend**

   ```bash
   cd backend
   pm2 start server.js --name vaulteer-backend
   ```

2. **Start frontend**

   ```bash
   cd frontend
   pm2 start npm --name vaulteer-frontend -- start
   ```

3. **Save PM2 configuration**

   ```bash
   pm2 startup
   pm2 save
   ```

4. **Check status**
   ```bash
   pm2 status
   pm2 logs
   ```

## Step 11: Configure SSL (Optional but Recommended)

1. **Install Certbot**

   ```bash
   sudo yum install certbot python3-certbot-nginx -y
   ```

2. **Get SSL certificate**

   ```bash
   sudo certbot --nginx -d your-domain.com -d www.your-domain.com
   ```

3. **Update environment variables for HTTPS**
   - Change `FRONTEND_URL` in backend `.env` to `https://your-domain.com`

## Step 12: Health Checks and Monitoring

1. **Test the application**

   ```bash
   curl http://localhost/api/health
   curl http://localhost
   ```

2. **Set up CloudWatch monitoring (optional)**
   ```bash
   # Install CloudWatch agent
   sudo yum install amazon-cloudwatch-agent -y
   sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
   ```

## Step 13: Backup and Maintenance

1. **Database backups are automatic** (configured in RDS)

2. **Application logs**

   ```bash
   pm2 logs vaulteer-backend
   pm2 logs vaulteer-frontend
   ```

3. **Update application**
   ```bash
   cd Vaulteer
   git pull origin main
   cd backend && npm install --production
   cd ../frontend && npm install && npm run build
   pm2 restart all
   ```

## Troubleshooting

### Common Issues

1. **Port conflicts**

   - Check if ports 3000 and 3001 are available
   - Use `netstat -tlnp | grep :300` to check

2. **Database connection issues**

   - Verify RDS security group allows connections from EC2
   - Check database credentials

3. **Firebase authentication issues**

   - Ensure service account key has correct permissions
   - Verify Firebase project configuration

4. **Nginx proxy issues**

   - Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
   - Verify proxy configuration

5. **Memory issues**
   - Monitor with `htop` or `free -h`
   - Consider upgrading instance type if needed

### Logs and Debugging

```bash
# Application logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx -f
```

## Cost Estimation

- **EC2 t3.medium**: ~$30/month
- **RDS t3.micro**: ~$15/month
- **Data transfer**: ~$10/month (depending on traffic)
- **Total**: ~$55/month for small-scale deployment

## Scaling Considerations

If you need to scale:

1. Move to separate instances for frontend and backend
2. Use Elastic Load Balancer
3. Consider containerization with ECS/EKS
4. Implement auto-scaling groups

## Security Best Practices

1. **Regular updates**: Keep system and dependencies updated
2. **Firewall**: Use security groups to restrict access
3. **SSL/TLS**: Always use HTTPS in production
4. **Environment variables**: Never commit secrets to version control
5. **Monitoring**: Set up alerts for unusual activity
6. **Backups**: Regular database backups and snapshots

## Support

For issues with this deployment:

1. Check the logs using the commands above
2. Verify all environment variables are set correctly
3. Ensure all prerequisites are met
4. Check AWS service status and your account limits
