# Deploiement prod (NAS Synology)

Objectif: avoir une version "production" deployable sur un NAS Synology avec Docker, accessible depuis un telephone via HTTPS.

Ce repo fournit une stack prod (gunicorn + next start) + un fichier d'env prod + des scripts pour restaurer un dump Postgres.

## 0) Ce qu'il ne faut PAS faire

- Ne pas exposer `docker-compose.yml` sur Internet (Django `runserver` + `next dev`).
- Ne pas ouvrir le port Postgres `5432` sur Internet.

## 1) Prerequis NAS

- DSM 7.x avec "Container Manager" (ou Docker)
- Un nom de domaine (ou DDNS Synology) + certificat HTTPS (Let's Encrypt via DSM)
- Reverse proxy DSM (Login Portal / Reverse Proxy)
- Acces SSH (recommande) pour lancer `docker compose` et les scripts

## 2) Fichiers prod a connaitre

- `docker-compose.prod.yml` : stack production
  - bind des ports en local uniquement: `127.0.0.1:3000` et `127.0.0.1:8000` (pas accessibles depuis l'exterieur)
- `Dockerfile.prod` : backend Django en prod (gunicorn + collectstatic)
- `frontend/Dockerfile.prod` : frontend Next.js en prod (build + `next start`)
- `.env.prod.example` : template des variables d'environnement prod (a copier en `.env.prod`)
- `scripts/deploy_prod.sh` : demarrage prod + restauration dump optionnelle + migrations
- `scripts/restore_db.sh` : restauration d'un dump `.dump` ou `.sql`

## 3) Configuration (.env.prod)

Sur le NAS (dans le dossier du projet):
```bash
cp .env.prod.example .env.prod
```

A remplir a minima:
- `DJANGO_SECRET_KEY` (fort, aleatoire)
- `POSTGRES_PASSWORD` (fort, aleatoire)
- `DJANGO_ALLOWED_HOSTS` (ex: `nutribuddy.example.com`)
- `NEXT_PUBLIC_API_BASE` (ex: `https://nutribuddy.example.com`)
- `CSRF_TRUSTED_ORIGINS` (ex: `https://nutribuddy.example.com`)
- `CORS_ALLOWED_ORIGINS` (ex: `https://nutribuddy.example.com`)

## 4) Deploiement prod (SSH / ligne de commande)

### 4.1 Demarrer (sans dump)
```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.prod -f docker-compose.prod.yml exec web python manage.py migrate
docker compose --env-file .env.prod -f docker-compose.prod.yml exec web python manage.py createsuperuser
```

### 4.2 Demarrer + restaurer une base depuis un dump

Le dump peut etre genere par:
- `scripts/export_db.sh` (Linux/macOS)
- `scripts/export_db.ps1` (Windows)

Sur le NAS:
```bash
scripts/deploy_prod.sh --db-dump backups/nutribuddy_YYYYMMDD_HHMMSS.dump --clean
```

Notes:
- `--clean` est destructif (recree les objets DB avant restore).
- Un dump `custom` (`.dump`) est recommande pour les grosses bases (plus rapide/robuste).

## 5) Reverse proxy DSM (HTTPS)

But: exposer UNIQUEMENT le port HTTPS (443) vers Internet, et laisser les conteneurs sur `127.0.0.1`.

Exemple (1 seul domaine):
- `https://nutribuddy.example.com/` -> `http://127.0.0.1:3000/` (frontend)
- `https://nutribuddy.example.com/api/` -> `http://127.0.0.1:8000/api/` (API)
- `https://nutribuddy.example.com/admin/` -> `http://127.0.0.1:8000/admin/` (admin)
- `https://nutribuddy.example.com/static/` -> `http://127.0.0.1:8000/static/` (static admin)

Ensuite:
- `NEXT_PUBLIC_API_BASE` doit etre `https://nutribuddy.example.com`
- `DJANGO_ALLOWED_HOSTS` doit contenir `nutribuddy.example.com`
- `CSRF_TRUSTED_ORIGINS` doit contenir `https://nutribuddy.example.com`
- activer `DJANGO_SECURE_PROXY_SSL_HEADER=1` (deja dans `.env.prod.example`)

## 6) Sauvegardes

Le service `backup` fait un `pg_dump` quotidien dans le volume Docker `backups` (retention via `BACKUP_RETAIN_DAYS`).

Verifier:
```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f backup
```

## 7) Mise a jour (upgrade)

Dans le dossier du projet:
```bash
git pull
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.prod -f docker-compose.prod.yml exec web python manage.py migrate
```

## 8) Depannage rapide

- Voir les services:
```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
```
- Logs backend:
```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f web
```
- Logs frontend:
```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f frontend
```

