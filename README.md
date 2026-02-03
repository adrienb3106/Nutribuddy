# Nutribuddy

Django backend (REST API) + Next.js frontend for a food app.

## Conventions
- DB and field names: explicit snake_case (`kcal_100g`, `protein_g_100g`, etc.)
- Nutrition values are stored per 100 g (V1)

## Backend quick start (V1)
The project is wired for Docker + PostgreSQL + Django + Next.js frontend.

### 1) Configure env
Copy `.env.example` to `.env` and edit values if needed.

### 2) Build and run
```bash
docker compose up --build
```

### 3) Run migrations
```bash
docker compose exec web python manage.py migrate
```

### 4) Create an admin user
```bash
docker compose exec web python manage.py createsuperuser
```

### 5) Import CIQUAL data (optional)
```bash
docker compose exec web python manage.py import_ciqual --path "data/Table Ciqual 2025_FR_2025_11_03.xls"
```

### 6) Auto-tag compatibilities (optional)
```bash
docker compose exec web python manage.py tag_compatibilities --dry-run
docker compose exec web python manage.py tag_compatibilities
```

### 7) Open admin
Visit `http://localhost:8000/admin/`.

### 8) API
Base URL: `http://localhost:8000/api/`

Examples:
```bash
curl "http://localhost:8000/api/foods/?page=1"
curl "http://localhost:8000/api/foods/?search=haricot"
curl "http://localhost:8000/api/foods/?vegan=true&kcal_max=200"
```

### 9) Auth (JWT)
Register:
```bash
curl -X POST "http://localhost:8000/api/auth/register/" \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","email":"user1@example.com","password":"password123"}'
```

Get token:
```bash
curl -X POST "http://localhost:8000/api/auth/token/" \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","password":"password123"}'
```

Refresh token:
```bash
curl -X POST "http://localhost:8000/api/auth/token/refresh/" \
  -H "Content-Type: application/json" \
  -d '{"refresh":"<refresh_token>"}'
```

### 10) Profile (dietary restrictions)
Get profile:
```bash
curl "http://localhost:8000/api/auth/profile/" \
  -H "Authorization: Bearer <access_token>"
```

Update profile:
```bash
curl -X PATCH "http://localhost:8000/api/auth/profile/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"vegan":true,"gluten_free":true,"lactose_free":true,"irritability_level":1}'
```

## Frontend (Next.js)
The frontend lives in `frontend/`.

### Option A: Docker (recommended)
`docker compose up --build` also starts the frontend on `http://localhost:3000/`.

If you want to override the API base URL, copy `frontend/.env.local.example` to `frontend/.env.local`.

### Option B: Local dev (without Docker)
```bash
cd frontend
npm install
npm run dev
```
Then open `http://localhost:3000/`.

## Environment variables
- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `DJANGO_ALLOWED_HOSTS`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `BACKUP_RETAIN_DAYS`
- `CORS_ALLOWED_ORIGINS`

## Backups (Step 8)
A `backup` service runs `pg_dump` once per day and keeps the last N days.

- Dumps are stored in a Docker volume named `backups`
- Retention is controlled by `BACKUP_RETAIN_DAYS` (default: 7)

You can override retention in `.env`:
```
BACKUP_RETAIN_DAYS=7
```

### Restore (example)
List backups:
```bash
docker volume ls
```

To restore, copy a dump out of the `backups` volume, then run:
```bash
psql -h localhost -U nutribuddy -d nutribuddy -f backup_YYYYMMDD_HHMMSS.sql
```

## Tests (Step 9)
```bash
docker compose exec web python manage.py test foods
```

## What’s already set up
- Docker Compose with `web` + `db` + `backup`
- Dockerfile + `requirements.txt`
- Django project with `foods` app
- Users app with profile + JWT auth
- FoodItem model (macros + optional micros + compatibilities + CIQUAL source fields)
- Admin list/search/filters
- REST API (CRUD)
- Filters, search, ordering, pagination
- CIQUAL import command
- Auto-tag command for compatibilities
- Automated backups (daily pg_dump + retention)
- API tests (create/filter/search/pagination/ordering)
- JWT auth endpoints (register, token, refresh)
- Profile endpoint (dietary restrictions)
- Next.js frontend (login/register/profile/foods)

Next steps are documented in `context.md`.
