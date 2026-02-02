# Nutri App — Django Backend (Evolvable V1)

## 1) Product goal
Create a food application with:
- **Backend**: Python **Django** (REST API)
- **DB**: **PostgreSQL**
- **Infra**: **Docker / docker-compose**
- **Frontend**: out of scope for now (we prepare a clean API)

Functional goal:
- Store a database of **foods/products**
- Provide **search + filters**: dietary restrictions, calories, macronutrients, text
- Deliver a **simple** but **evolvable V1**, keeping decisions easy to understand

---

## 2) Data to store (V1)

### 2.1 Main fields
Each item represents a **FoodItem** (raw ingredient, cooked dish, industrial product).

Fields:
- **name**
- **type**: `de_base`, `cuisine`, `transforme`
  - ex: “green beans” = de_base  
  - “dauphinois gratin” = cuisine  
  - “brand X industrial meal” = transforme
- **kcal** (calories)
- **macronutrients**: protein, carbs, fat (in grams)
- **compatibilities** (V1 booleans):
  - vegan
  - vegetarian
  - pescetarian
  - irritable bowel (V1 simplified, “compatible”)
  - gluten-free
  - lactose-free
- **barcode** (EAN/GTIN) if supermarket product

### 2.2 Nutrition convention
- Store values **per 100 g** (V1)
- (V2) extend to 100 ml / portion, etc.

---

## 3) Modeling principles (V1)

### 3.1 Recommended V1 model
- **One main model: `FoodItem`**
- All nutrition + compatibilities live in this model (simple, readable)

### 3.2 Compatibilities
- V1: **boolean fields** on `FoodItem`
- V2: possible migration to a **tags/restrictions** ManyToMany system if needed

### 3.3 Barcode
- `barcode`: nullable text, **unique** if present
- index to speed up search

---

## 4) Expected API (V1)

### 4.1 REST endpoints
- `GET /api/foods` : list + filters
- `GET /api/foods/{id}` : detail
- `POST /api/foods` : create
- `PATCH /api/foods/{id}` : partial update
- `DELETE /api/foods/{id}` : delete

### 4.2 Search and filters
- Text search: `?search=green beans`
- Type filter: `?type=de_base`
- Compatibilities: `?vegan=true&gluten_free=true` etc.
- Calories: `?kcal_min=0&kcal_max=200`
- Macros: `?protein_min=...&carbs_max=...` (optional but easy to add)
- Pagination: yes (standard DRF)

### 4.3 Filtering rule
- A compatibility is applied **only if requested**
- Example: `?vegan=true` => only items with `vegan=True`

---

## 5) Django admin (V1)
Admin goals:
- Full CRUD
- Search by **name** and **barcode**
- Quick filters: type, compatibilities

---

## 6) PostgreSQL backups (reasonable V1)
Goal: avoid data loss due to mistakes.

Recommended V1:
- `backup` docker service (cron + `pg_dump`)
- Timestamped dumps in a **volume**
- Simple retention (e.g. keep 7 days)
- DB not publicly exposed, secrets via `.env`

---

## 7) Containerization (V1)
`docker-compose` with:
- `web`: Django
- `db`: PostgreSQL
- `backup`: cron + pg_dump (recommended)

Dev:
- hot reload
- code volume
- postgres data volume
- backups volume

---

## 8) Expected quality (pedagogy)
The coding assistant should:
- Move **step by step**
- Explain choices (simple vs scalable)
- Avoid over-engineering
- Add a few API tests (critical filters)
- Keep a clear, standard Django architecture

---

## 9) Planned evolutions (V2/V3)
Without implementing them in V1, the structure should allow:
- Import from external sources (e.g., Open Food Facts via barcode)
- Recipes: cooked dishes = aggregation of ingredients
- Micronutrients, allergens, scores (Nutri-score, NOVA)
- Portions/100ml
- Users + restriction profiles

---

## 10) Definition of “V1 done”
V1 is done when:
- CRUD via admin + API
- Paginated list
- Filters: type, compatibilities, calories (macros ideally)
- Text search
- PostgreSQL under docker-compose
- Simple automated backups
- Clean migrations
- Minimal API tests

---

# Implementation plan (step by step)

## Step 0 — Repository initialization
Goal: a clean repo.
- Create repo + Python/Django `.gitignore`
- Create `.env.example` (no secrets)
- Choose a naming convention (snake_case in DB, explicit fields)

Deliverable:
- Repo ready, empty but healthy structure

---

## Step 1 — Docker + PostgreSQL + Django “hello world”
Goal: a working stack.
- Write `docker-compose.yml` with `web` + `db`
- Django Dockerfile
- Dependencies: `Django`, `djangorestframework`, `psycopg` (or psycopg2), `django-filter`
- Django settings read `.env`
- Connect to PostgreSQL

Deliverable:
- `docker compose up` starts Django + DB
- Basic page (admin later)

---

## Step 2 — Create Django project and “foods” app
Goal: clear structure.
- `django-admin startproject`
- Create a dedicated app: `foods`
- Add the app to `INSTALLED_APPS`

Deliverable:
- Standard Django project, foods app ready

---

## Step 3 — Models (FoodItem) + migrations
Goal: V1 schema.
- Create `FoodItem` with:
  - `name`
  - `food_type` (enum)
  - `kcal_100g`
  - `protein_g_100g`, `carbs_g_100g`, `fat_g_100g`
  - compatibility booleans
  - `barcode` (nullable, unique if present)
  - timestamps (`created_at`, `updated_at`) (optional but useful)
- Constraints:
  - nutrition values >= 0
  - index on `name` and `barcode`

Deliverable:
- Migrations OK
- Tables created in DB

---

## Step 4 — Django admin
Goal: simple manual management.
- Register `FoodItem` in admin
- Configure:
  - `list_display` (name, type, kcal, key compatibilities)
  - `search_fields` (name, barcode)
  - `list_filter` (type, compatibilities)
  - ordering

Deliverable:
- Full CRUD via admin

---

## Step 5 — DRF: serializers + views + routes
Goal: REST endpoints.
- Add DRF
- `FoodItemSerializer`
- ViewSet (ModelViewSet) + router
- Routes: `/api/foods/`

Deliverable:
- CRUD API working

---

## Step 6 — Filters and search
Goal: useful queries.
- `django-filter`: FilterSet for:
  - `food_type`
  - `kcal_min/kcal_max`
  - macro min/max
  - compatibilities (booleans)
- SearchFilter: `search` on `name` (and optionally barcode)
- DRF pagination

Deliverable:
- `GET /api/foods?search=...&kcal_max=...&vegan=true` works

---

## Step 7 — Validation and domain consistency
Goal: prevent nonsense data.
- Validators on nutrition fields
- Simple rules:
  - `barcode` EAN/GTIN format (optional V1, otherwise V2)
  - compatibility consistency (e.g., vegan => vegetarian => pescetarian, depending on chosen logic)
    - V1 option: do not enforce, just store
    - V2: possible auto-derivation

Deliverable:
- Data clean and predictable

---

## Step 8 — Automated backups
Goal: safety net.
- Add a `backup` service in docker-compose
- Bash script that runs `pg_dump` to `/backups`
- Cron in the container (or sleep loop)
- Simple retention (delete dumps > 7 days)

Deliverable:
- Timestamped backups automatically generated in a volume

---

## Step 9 — Minimal tests (API)
Goal: avoid regressions.
- DRF tests:
  - create a FoodItem
  - filter `vegan=true`
  - filter `kcal_max`
  - search `search`
- Run tests in docker

Deliverable:
- Reliable basic test suite

---

## Step 10 — Dev documentation
Goal: onboarding and clarity.
- README:
  - docker commands
  - environment variables
  - main endpoints + sample requests
  - backup and restore strategy (command `psql`/`pg_restore`)

Deliverable:
- Project understandable and reusable

---

# Decision notes (V1)
- **Compatibilities as booleans**: simple and readable ? can migrate to tags later
- **Nutrition per 100g**: avoids ambiguity and eases comparison
- **DRF + django-filter**: standard, robust, easy to extend
- **pg_dump backup**: effective, portable, suitable for V1