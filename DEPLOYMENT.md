# MANDIQ APMC FairProcure Platform — Production Deployment Guide

This guide provides step-by-step instructions for deploying the **MANDIQ APMC FairProcure Platform** in high-availability, production environments (such as state APMC data centers, AWS, Azure, or DigitalOcean).

---

## 🏗 Architecture & Network Topology

In a production deployment, all external traffic hits the Nginx Ingress Gateway on ports `80` (HTTP) and `443` (HTTPS with TLS).

```
                      [ INTERNET / FIELD CLIENTS ]
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │   Nginx Ingress Gateway       │
                   │   (Port 80 / 443 with SSL)    │
                   └───────┬───────────────┬───────┘
                           │               │
               Path: /     │               │ Path: /api/v1/*, /docs
                           ▼               ▼
                 ┌──────────────────┐    ┌──────────────────┐
                 │ Frontend (SPA)   │    │ Backend API      │
                 │ Nginx 1.27       │    │ FastAPI + Uvicorn│
                 │ (Container :80)  │    │ (Container :8000)│
                 └──────────────────┘    └────────┬─────────┘
                                                  │
                                                  ▼
                                         ┌──────────────────┐
                                         │ PostgreSQL 16 DB │
                                         │ (Container :5432)│
                                         └──────────────────┘
```

All containers communicate across an isolated internal Docker bridge network (`mandiq-network`). Only the Gateway exposes ports to the host.

---

## 💻 Hardware Requirements

| Component | Minimum Specification | Recommended Production |
|---|---|---|
| **CPU** | 2 vCPU | 4+ vCPU |
| **Memory** | 4 GB RAM | 8+ GB RAM |
| **Disk Space** | 20 GB SSD | 50+ GB NVMe SSD |
| **OS** | Ubuntu 22.04 LTS / Debian 12 | Ubuntu 22.04 LTS (Kernel 5.15+) |

---

## 📋 Pre-Deployment Checklist

1. [ ] Docker Engine 24.0+ and Docker Compose v2.20+ installed.
2. [ ] Valid domain or static IP configured with DNS A-records.
3. [ ] Secrets generated using cryptographically secure random generators.
4. [ ] Ingress firewall rules configured: allow ports `80`, `443`, and `22` (SSH). Close `5432` and `8000` to the public internet.

---

## 🔑 Environment Configuration

Create the production `.env` file from the provided template:

```bash
cp .env.example .env
chmod 600 .env
```

Edit `.env` and set the following critical parameters:

```env
# Production Environment
APP_ENV=production
DEBUG=false
LOG_LEVEL=INFO

# Generate high-entropy 64-character hex secret:
# Run: openssl rand -hex 32
SECRET_KEY=e83a992fb2c88f17a942b0e6e72b4c10a48b3726db0811e51bc389f41b9d40a2

# APMC Supervisor Master Override PIN
SUPERVISOR_MASTER_PIN=8492

# PostgreSQL Database Credentials
POSTGRES_DB=mandiq
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_strong_random_db_password_here
DATABASE_URL=postgresql://postgres:your_strong_random_db_password_here@postgres:5432/mandiq

# CORS Domain Configuration (replace with your production domain)
CORS_ORIGINS=https://mandiq.example.gov.in,http://localhost
```

---

## 🚀 Deployment Steps

### 1. Build & Launch Containers
```bash
# Pull base images and build with buildkit enabled
DOCKER_BUILDKIT=1 docker compose build

# Launch services in detached daemon mode
docker compose up -d
```

### 2. Verify Container Health
```bash
docker compose ps
```

All 4 services should report `Up (healthy)`:
- `mandiq-postgres`
- `mandiq-backend`
- `mandiq-frontend`
- `mandiq-gateway`

### 3. Verify Database Migrations
Migrations execute automatically inside `backend/entrypoint.sh` upon startup. You can manually verify the migration state with:
```bash
docker compose exec backend alembic current
```

---

## 🔒 SSL / TLS Configuration with Let's Encrypt

To configure HTTPS on your domain using Certbot:

1. Install Certbot on the host:
   ```bash
   sudo apt update && sudo apt install -y certbot python3-certbot-nginx
   ```
2. Obtain certificate:
   ```bash
   sudo certbot certonly --standalone -d mandiq.example.gov.in
   ```
3. Mount the certificate directory into the `gateway` container by updating `docker-compose.yml`:
   ```yaml
   volumes:
     - /etc/letsencrypt:/etc/letsencrypt:ro
   ```
4. Configure SSL in `nginx/nginx.conf`:
   ```nginx
   server {
       listen 443 ssl http2;
       server_name mandiq.example.gov.in;

       ssl_certificate /etc/letsencrypt/live/mandiq.example.gov.in/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/mandiq.example.gov.in/privkey.pem;
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers HIGH:!aNULL:!MD5;
       ...
   }
   ```

---

## 💾 Database Backup & Disaster Recovery

### Automated Daily PostgreSQL Backups
Add a crontab entry on the host to backup the database every night at 02:00 AM:

```bash
# Open crontab editor
crontab -e

# Append backup cron rule
0 2 * * * docker compose -f /path/to/mandiq/docker-compose.yml exec -T postgres pg_dump -U postgres mandiq | gzip > /var/backups/mandiq/mandiq_$(date +\%Y\%m\%d_\%H\%M\%S).sql.gz
```

### Restoring from Backup
```bash
gunzip < /var/backups/mandiq/mandiq_20260913_020000.sql.gz | docker compose exec -T postgres psql -U postgres -d mandiq
```

---

## 📊 Monitoring & Health Checks

| Endpoint | Target | Expected Status |
|---|---|---|
| `http://<host>/health` | Ingress Gateway & Backend | HTTP 200 `{"status": "ok", "database": "connected"}` |
| `http://<host>/api/v1/dashboard/summary` | Yard Telemetry | HTTP 200 with queue counts |
| `http://<host>/docs` | Swagger Interface | HTTP 200 interactive UI |

### Viewing Production Logs
```bash
# Follow all application logs
docker compose logs -f

# View backend error logs specifically
docker compose logs -f backend | grep ERROR
```

---

## 🔄 Zero-Downtime Application Updates

To deploy an updated release without dropping database connections:

```bash
# 1. Pull latest code
git pull origin main

# 2. Build updated images
docker compose build backend frontend

# 3. Apply rolling upgrade
docker compose up -d --no-deps backend
docker compose up -d --no-deps frontend
docker compose up -d --no-deps gateway
```
