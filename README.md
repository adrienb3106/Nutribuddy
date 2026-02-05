# Nutribuddy

Django backend (REST API) + Next.js frontend for a food app.

**Overview**
Nutribuddy provides a clean API to store foods/products, search/filter by nutrition, and tag dietary compatibilities. The V1 focuses on simple, evolvable modeling and a working Docker stack.

**Prerequisites**
- Docker Desktop (Compose v2)
- PowerShell for the one-command deploy script
- Optional: Node 18+ if you want to run the frontend outside Docker

**Configuration**
Copy `.env.example` to `.env` and edit values if needed.

Variables used:
- `DJANGO_SECRET_KEY` Secret key for Django
- `DJANGO_DEBUG` `1` for dev, `0` for production
- `DJANGO_ALLOWED_HOSTS` Comma-separated hosts
- `POSTGRES_DB` Database name
- `POSTGRES_USER` Database user
- `POSTGRES_PASSWORD` Database password
- `POSTGRES_HOST` Database host (Docker service name)
- `POSTGRES_PORT` Database port
- `BACKUP_RETAIN_DAYS` Backup retention window
- `CORS_ALLOWED_ORIGINS` Allowed CORS origins

**One-Command Deploy**
This script builds containers, starts services, waits for Postgres, runs migrations, imports CIQUAL + Open Food Facts minimal, tags compatibilities, and prints frontend/backend URLs.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1
```

Defaults used by the script:
- CIQUAL file: `data/Table Ciqual 2025_FR_2025_11_03.xls`
- Open Food Facts minimal file: `data/openfoodfacts-products.fr.food.min.jsonl.gz`

Common options:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1 `
  -CiqualPath "data/Table Ciqual 2025_FR_2025_11_03.xls" `
  -OffPath "data/openfoodfacts-products.fr.food.min.jsonl.gz" `
  -OffCommitEvery 10000 `
  -OffLogEvery 10000
```
```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1 -SkipOff
```
```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1 -SkipTags
```
```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1 -OnlyIfDefault
```

**Manual Start (Step-by-Step)**
1. Build and start
```bash
docker compose up --build
```
2. Run migrations
```bash
docker compose exec web python manage.py migrate
```
3. Create admin user
```bash
docker compose exec web python manage.py createsuperuser
```

**Data Sources**
CIQUAL is used for base food items. Open Food Facts (OFF) provides packaged products. OFF imports are heavier and optional.

CIQUAL import:
```bash
docker compose exec web python manage.py import_ciqual --path "data/Table Ciqual 2025_FR_2025_11_03.xls"
```

Open Food Facts minimal export (from a full OFF dump):
```bash
python scripts/prepare_openfoodfacts_minimal.py \
  --input "data/openfoodfacts-products.jsonl.gz" \
  --output "data/openfoodfacts-products.fr.food.min.jsonl.gz"
```

Open Food Facts minimal import:
```bash
docker compose exec web python manage.py import_openfoodfacts_minimal \
  --path "data/openfoodfacts-products.fr.food.min.jsonl.gz"
```

If the import is heavy, commit in batches and log progress:
```bash
docker compose exec web python manage.py import_openfoodfacts_minimal \
  --path "data/openfoodfacts-products.fr.food.min.jsonl.gz" \
  --commit-every 10000 \
  --log-every 10000
```

**Auto-Tag Compatibilities**
Two commands exist and serve different data sources.

CIQUAL tagging (from group/subgroup names):
```bash
docker compose exec web python manage.py tag_compatibilities
```

Open Food Facts tagging (ingredients + labels + allergens):
```bash
docker compose exec web python manage.py tag_openfoodfacts_compatibilities --log-every 10000
```

FODMAP tagging is included in both commands. The keyword lists live in
`foods/fodmap.py` and the result is stored in `irritability_level` as
`low_fodmap` or `high_fodmap` (unknown stays null).

**Mettre à jour les compatibilités (règles/keywords)**
- CIQUAL (noms produits) : les listes FR/EN sont dans
  `foods/compatibility_keywords.py` (déjà normalisées, sans accents). Mettez
  à jour ces listes pour ajuster vegan/végétarien/pescetarien/gluten/lactose.
- Open Food Facts : les règles de labels/analyse et les mots‑clés live dans
  `foods/management/commands/tag_openfoodfacts_compatibilities.py`.
- FODMAP : listes low/high dans `foods/fodmap.py`.

Après modification, relancer le tagging :
```bash
docker compose exec web python manage.py tag_compatibilities
```
```bash
docker compose exec web python manage.py tag_openfoodfacts_compatibilities
```

**Data cleanup (aberrant foods)**
You can scan and optionally delete rows with placeholder or nonsensical names.

Dry run (recommended):
```bash
docker compose exec web python manage.py clean_foods
```

Apply deletion:
```bash
docker compose exec web python manage.py clean_foods --apply
```

Tune heuristics (optional):
```bash
docker compose exec web python manage.py clean_foods --min-alpha-ratio 0.4 --min-letters 4
```

Only tag rows that are still at default values:
```bash
docker compose exec web python manage.py tag_compatibilities --only-if-default
```
```bash
docker compose exec web python manage.py tag_openfoodfacts_compatibilities --only-if-default
```

**Infer Missing Allergens (optional)**
If `allergens_tags` is empty, you can infer allergens from the product name or ingredients:
```bash
docker compose exec web python manage.py infer_allergens --dry-run
```
```bash
docker compose exec web python manage.py infer_allergens --log-every 10000
```

**Backend URLs**
- API root: `http://localhost:8000/api/`
- Admin: `http://localhost:8000/admin/`

**API Endpoints (V1)**
- `GET /api/foods/`
- `GET /api/foods/{id}/`
- `POST /api/foods/`
- `PATCH /api/foods/{id}/`
- `DELETE /api/foods/{id}/`

Examples:
```bash
curl "http://localhost:8000/api/foods/?page=1"
```
```bash
curl "http://localhost:8000/api/foods/?search=haricot"
```
```bash
curl "http://localhost:8000/api/foods/?vegan=true&kcal_max=200"
```

Filters supported:
- `search` on `name` (and barcode when relevant)
- `food_type` and compatibilities (`vegan`, `vegetarian`, `pescetarian`, `gluten_free`, `lactose_free`)
- `irritability_level` (`low_fodmap` or `high_fodmap`)
- `kcal_min` and `kcal_max`
- `protein_min`, `protein_max`, `carbs_min`, `carbs_max`, `fat_min`, `fat_max`
- `barcode` exact match
- `allergens` + `exclude_allergens` to filter out items that contain selected allergens

Allergen filtering example:
```bash
curl "http://localhost:8000/api/foods/?allergens=peanuts,milk&exclude_allergens=true"
```

Allergen keys:
- `gluten`
- `milk`
- `eggs`
- `fish`
- `crustaceans`
- `molluscs`
- `peanuts`
- `nuts`
- `soy`
- `celery`
- `mustard`
- `sesame`
- `lupin`
- `sulphites`

**Auth (JWT)**
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

Profile:
```bash
curl "http://localhost:8000/api/auth/profile/" \
  -H "Authorization: Bearer <access_token>"
```
```bash
curl -X PATCH "http://localhost:8000/api/auth/profile/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"vegan":true,"gluten_free":true,"lactose_free":true,"irritability_level":"low_fodmap","allergens":["peanuts","milk"],"filter_allergens":true}'
```

**Frontend (Next.js)**
Docker (recommended):
```bash
docker compose up --build
```
Frontend URL: `http://localhost:3000/`
Scan page (mobile camera): `http://localhost:3000/scan`

Note: the Foods list shows allergen warnings when your profile is applied, and can optionally filter them out.

Local dev (without Docker):
```bash
cd frontend
npm install
npm run dev
```

If you need a custom API base URL, copy `frontend/.env.local.example` to `frontend/.env.local`.

**Backups**
A `backup` service runs `pg_dump` once per day and keeps the last N days.

Details:
- Backups are stored in a Docker volume named `backups`.
- Retention is controlled by `BACKUP_RETAIN_DAYS` (default: 7).

Restore example:
```bash
docker volume ls
```
```bash
psql -h localhost -U nutribuddy -d nutribuddy -f backup_YYYYMMDD_HHMMSS.sql
```

**Database Export/Import (for Synology or migrations)**
Export a dump (recommended: custom format):
```bash
scripts/export_db.sh
```
```bash
scripts/export_db.sh --output backups/nutribuddy_20260101_120000.dump
```

Restore a dump:
```bash
scripts/restore_db.sh --input backups/nutribuddy_20260101_120000.dump
```

If you need to replace an existing database:
```bash
scripts/restore_db.sh --input backups/nutribuddy_20260101_120000.dump --clean
```

Windows (PowerShell):
```powershell
powershell -ExecutionPolicy Bypass -File scripts/export_db.ps1
```
```powershell
powershell -ExecutionPolicy Bypass -File scripts/export_db.ps1 -Output backups\nutribuddy_20260101_120000.dump -Format custom
```
```powershell
powershell -ExecutionPolicy Bypass -File scripts/restore_db.ps1 -Input backups\nutribuddy_20260101_120000.dump
```
```powershell
powershell -ExecutionPolicy Bypass -File scripts/restore_db.ps1 -Input backups\nutribuddy_20260101_120000.dump -Clean
```

**Tests**
```bash
docker compose exec web python manage.py test foods
```

**Project Structure**
- `nutribuddy/` Django project settings
- `foods/` FoodItem model, API, imports, tagging
- `users/` Auth and profile endpoints
- `frontend/` Next.js app
- `scripts/` Utilities and deploy script
- `data/` Local datasets (CIQUAL, OFF, samples)

**What’s Already Set Up**
- Docker Compose with `web` + `db` + `backup` + `frontend`
- Django + DRF + filtering + pagination
- FoodItem model with nutrition fields and compatibilities
- Admin search and filters
- CIQUAL import and Open Food Facts minimal import
- Compatibility tagging for CIQUAL and OFF
- JWT auth endpoints and dietary profile
- Allergy profile + allergen filtering/warnings
- Automated backups
- Basic API tests
- Mobile barcode scan page (frontend)

Next steps are documented in `context.md`.
