# Phase 7: Production Deployment Guide

**Date**: 2026-11-09  
**Platform**: CustomGift E-Commerce Platform  
**Target Environments**: Docker Compose / Linux VPS / AWS EC2 / DigitalOcean  

---

## 1. Prerequisites

- Linux Server (Ubuntu 22.04 LTS or 24.04 LTS recommended)
- Docker Engine 24.0+ and Docker Compose v2 (plugin)
- Domain name with DNS pointing to your server (e.g. `api.customgift.dev`, `customgift.dev`)
- SSL Certificate (Let's Encrypt / Certbot or reverse proxy termination like Cloudflare / Traefik)
- PostgreSQL 16+ (or managed RDS instance)
- Razorpay account in Live mode
- Cloudinary account for media assets (optional for cloud storage, otherwise local volume persistent storage)
- SMTP credentials for transactional password reset emails

---

## 2. Environment Configuration

Create a production `.env` file on the deployment server:

```bash
# Core Environment
APP_ENV=production
DEBUG=false
SECRET_KEY=generate-at-least-64-random-characters-using-openssl-rand-hex-32

# Database Connection (PostgreSQL)
POSTGRES_DB=customgift_prod
POSTGRES_USER=customgift_admin
POSTGRES_PASSWORD=use-a-strong-generated-password-here
DATABASE_URL=postgresql+psycopg://customgift_admin:use-a-strong-generated-password-here@db:5432/customgift_prod

# Domain and Security
CORS_ORIGINS=https://customgift.dev,https://www.customgift.dev
FRONTEND_URL=https://customgift.dev

# Administrator Seed Credentials (Initial Bootstrap)
ADMIN_NAME=CustomGift Operations
ADMIN_EMAIL=security@customgift.dev
ADMIN_PASSWORD=SetAStrongRandomPassword123!

# Payment Integration (Razorpay)
PAYMENT_DEMO_MODE=false
RAZORPAY_KEY_ID=rzp_live_your_live_key_id
RAZORPAY_KEY_SECRET=your_live_key_secret

# Media Storage (Cloudinary - Optional)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Transactional Email (SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your_smtp_api_key
SMTP_FROM_EMAIL=noreply@customgift.dev
```

---

## 3. Deployment using Docker Compose

Deploy the hardened production stack:

```bash
# 1. Clone repository on production host
git clone <repository_url>
cd CustomGift-Platform

# 2. Verify environment configuration
test -f .env || echo "Error: .env is missing!"

# 3. Build and launch services in detached mode
docker compose -f docker-compose.prod.yml up --build -d

# 4. Monitor startup logs
docker compose -f docker-compose.prod.yml logs -f backend

# 5. Verify service health
docker compose -f docker-compose.prod.yml ps
```

---

## 4. Database Migrations & Seeding

Migrations and idempotent seeding execute automatically upon container startup via `entrypoint.sh`:
- Runs `alembic upgrade head`
- Executes `python -m app.seed` (ensures administrator account exists)
- Launches Uvicorn on unprivileged port 8000

To run migrations manually:
```bash
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

To rollback a migration:
```bash
docker compose -f docker-compose.prod.yml exec backend alembic downgrade -1
```

---

## 5. Health Probes & Monitoring

The backend exposes standard health endpoints:
- **Liveness Probe**: `GET http://localhost:8000/health` (HTTP 200 `{"status": "ok"}`)
- **Readiness Probe**: `GET http://localhost:8000/health/ready` (HTTP 200 `{"status": "ready", "database": "connected"}`)

If database connection is severed, `/health/ready` returns HTTP 503 Service Unavailable, prompting Docker / orchestrators to stop routing traffic to unhealthy instances.

---

## 6. Backup & Recovery Strategy

### Automated PostgreSQL Backup Script
```bash
#!/usr/bin/env bash
set -e
BACKUP_DIR="/var/backups/customgift"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

docker compose -f docker-compose.prod.yml exec -T db pg_dump -U customgift_admin customgift_prod | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# Retain backups for 30 days
find "$BACKUP_DIR" -type f -name "db_*.sql.gz" -mtime +30 -delete
```

### Restore Database
```bash
gunzip < /var/backups/customgift/db_YYYYMMDD_HHMMSS.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U customgift_admin -d customgift_prod
```
