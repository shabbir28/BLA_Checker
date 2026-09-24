#!/usr/bin/env bash
# ==============================================================================
# BLA Checker - Automated Ubuntu 22.04 / 24.04 Production Deployment Script
# Installs: Node.js 22, PostgreSQL 16/18, Nginx, PM2, and builds the application.
# ==============================================================================

set -e

echo ">>> [1/6] Updating Ubuntu packages..."
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y curl git ufw build-essential libpq-dev

echo ">>> [2/6] Installing Node.js 22 LTS..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

echo ">>> [3/6] Installing & Configuring PostgreSQL..."
sudo apt-get install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create Database and User
sudo -u postgres psql -c "CREATE DATABASE bla_checker;" || true
sudo -u postgres psql -c "CREATE USER bla_user WITH ENCRYPTED PASSWORD 'StrongProductionPassword123!';" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE bla_checker TO bla_user;" || true
sudo -u postgres psql -d bla_checker -c "GRANT ALL ON SCHEMA public TO bla_user;" || true

echo ">>> [4/6] Installing Dependencies and Running Migrations..."
cd /var/www/bla-checker/backend
if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
fi
npm install --production=false
npm run setup

echo ">>> [5/6] Building React Frontend..."
cd /var/www/bla-checker/frontend
npm install
npm run build

echo ">>> [6/6] Configuring PM2 & Nginx..."
cd /var/www/bla-checker
mkdir -p logs
pm2 start ecosystem.config.cjs --env production
pm2 save
sudo pm2 startup systemd -u $USER --hp $HOME

# Link Nginx config
sudo cp deployment/nginx.conf /etc/nginx/sites-available/bla-checker
sudo ln -sf /etc/nginx/sites-available/bla-checker /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Firewall Setup
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
echo "y" | sudo ufw enable

echo "=========================================================="
echo "  BLA Checker Production Deployment Completed Successfully!"
echo "  Access URL: http://<your-server-ip>"
echo "  Default Admin: admin@blachecker.com / Admin123!"
echo "  Default User:  user@blachecker.com / User123!"
echo "=========================================================="
