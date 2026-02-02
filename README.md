# Nutribuddy

Django backend (REST API) for a food app. Frontend is out of scope for now.

## Conventions
- DB and field names: explicit snake_case (`kcal_100g`, `protein_g_100g`, etc.)
- Nutrition values are stored per 100 g (V1)

## Quick start (V1)
The project is wired for Docker + PostgreSQL + Django.

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

### 5) Open admin
Visit `http://localhost:8000/admin/`.

## What’s already set up (Step 1)
- `docker-compose.yml` with `web` + `db`
- `Dockerfile`
- `requirements.txt` with Django/DRF/django-filter/psycopg
- Minimal Django project (`manage.py`, `nutribuddy/` settings/urls/asgi/wsgi)

Next steps are documented in `context.md`.