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

### 5) Import CIQUAL data (optional)
```bash
docker compose exec web python manage.py import_ciqual --path "data/Table Ciqual 2025_FR_2025_11_03.xls"
```

### 6) Open admin
Visit `http://localhost:8000/admin/`.

## What’s already set up
- Docker Compose with `web` + `db`
- Dockerfile + `requirements.txt`
- Django project with `foods` app
- CIQUAL import command

Next steps are documented in `context.md`.