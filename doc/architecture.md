# Architecture

Ce document decrit l'architecture du repo Nutribuddy (backend Django + frontend Next.js) et reference tous les fichiers importants.

## Vue d'ensemble

Nutribuddy est compose de:
- un backend Django (API REST + admin)
- un frontend Next.js (UI)
- une base PostgreSQL
- un service de backup (pg_dump)

Deux stacks Docker existent:
- DEV: `docker-compose.yml` (serveurs de dev, volumes montes, DB exposee)
- PROD: `docker-compose.prod.yml` (gunicorn + next start, ports binds en localhost, reverse proxy HTTPS attendu)

## Flux principal

- Le frontend appelle l'API Django via `NEXT_PUBLIC_API_BASE` (ex: `https://nutribuddy.example.com`).
- L'auth utilise JWT (SimpleJWT). Les tokens sont stockes en localStorage cote frontend.
- Les "compatibilites" (vegan, gluten_free, etc.) sont taguees par des commandes Django (CIQUAL et Open Food Facts).
- Le profil utilisateur stocke les preferences (compatibilites + allergens + filtre).
- L'historique de scan est stocke en base via `ScanHistory`.

## Backend (Django)

### Projet Django: `nutribuddy/`
- `nutribuddy/settings.py`: settings + lecture env + securite (HSTS/SSL/cookies) + WhiteNoise (static).
- `nutribuddy/urls.py`: routes (admin, API foods, auth JWT).
- `nutribuddy/wsgi.py` et `nutribuddy/asgi.py`: points d'entree serveurs.

### App `foods/`
Responsabilites:
- modele `FoodItem` (CIQUAL + Open Food Facts)
- modele `ScanHistory` (historique de scan par utilisateur)
- API REST `/api/foods/` + `/api/scan-history/`
- tagging compatibilites + FODMAP + allergens

Pieces principales:
- `foods/models.py`: schema (FoodItem, ScanHistory) + contraintes simples.
- `foods/serializers.py`: serialisation API + `fodmap_matches` pour expliquer les tags FODMAP.
- `foods/views.py`: ViewSets (CRUD foods, historique scan) + endpoint `GET /api/foods/brands/`.
- `foods/filters.py`: filtres `kcal_min/max`, macros, compatibilites, irritabilite, marques, barcode + exclusion allergens.
- `foods/fodmap.py`: listes low/high FODMAP + classifieur + detail des matches.
- `foods/allergens.py`: regles allergens + helper de detection + queries.

Management commands (batch/offline):
- `import_ciqual`: charge un fichier CIQUAL Excel.
- `import_openfoodfacts_minimal`: charge un export JSONL minimal Open Food Facts.
- `tag_compatibilities`: tagging CIQUAL (group/subgroup + mots cles).
- `tag_openfoodfacts_compatibilities`: tagging OFF (ingredients/labels/allergens + FODMAP).
- `infer_allergens`: infere `allergens_tags` si vide.
- `clean_foods`: detecte/supprime des aliments "aberrants" (noms vides, placeholders, etc.).

### App `users/`
Responsabilites:
- creation compte + profil utilisateur
- stockage des preferences (compatibilites + allergens + filtre)

Pieces principales:
- `users/models.py`: `UserProfile`.
- `users/views.py`: endpoints register + profile.
- `users/serializers.py`: serialisation register + profil.

## Frontend (Next.js)

Frontend Next.js "App Router" dans `frontend/src/app/`:
- pages: `page.tsx` (home), `foods/page.tsx`, `scan/page.tsx`, `profile/page.tsx`, `login/page.tsx`, `register/page.tsx`, `info/page.tsx`
- layout global: `layout.tsx` (nav/footer, auth simple)
- style: `globals.css` (design system maison)

Lib:
- `frontend/src/lib/api.ts`: wrapper fetch + refresh token auto
- `frontend/src/lib/auth.ts`: gestion tokens (localStorage)
- `frontend/src/lib/allergens.ts`: detection allergens cote UI (pour warnings/filtre)

## Scripts et ops

- `scripts/deploy.ps1`: script dev "tout-en-un" (containers + migrations + imports + tags).
- `scripts/deploy_prod.sh` / `scripts/deploy_prod.ps1`: demarrage prod + restore dump optionnel + migrations.
- `scripts/export_db.*` et `scripts/restore_db.*`: export/restore Postgres via le conteneur `db`.
- `scripts/backup.sh`: pg_dump journalier dans un volume + retention.
- `scripts/prepare_openfoodfacts_minimal.py`: transforme un dump OFF complet en export minimal FR/food.

## Index des fichiers (repo)

Note: les fichiers ignores par git (ex: `.env`, `.env.prod`, `data/`) sont listes a la fin.

### Racine
- `AGENTS.md`: instructions internes (process, conventions).
- `.dockerignore`: fichiers exclus du build Docker (contexte d'image).
- `README.md`: guide d'utilisation rapide + commandes.
- `context.md`: notes de contexte / backlog.
- `requirements.txt`: dependances Python (Django/DRF/etc.).
- `manage.py`: entree Django.
- `Dockerfile`: image DEV backend (runserver).
- `Dockerfile.prod`: image PROD backend (gunicorn + collectstatic).
- `docker-compose.yml`: stack DEV (web/frontend/db/backup).
- `docker-compose.prod.yml`: stack PROD (ports binds en localhost + reverse proxy attendu).
- `.gitignore`: fichiers ignores (env, data, node_modules, etc.).
- `.env.example`: template env DEV.
- `.env.prod.example`: template env PROD.

### `nutribuddy/`
- `nutribuddy/__init__.py`: package Python.
- `nutribuddy/settings.py`: settings Django + securite + WhiteNoise.
- `nutribuddy/urls.py`: routes globales (admin + API + JWT).
- `nutribuddy/wsgi.py`: entree WSGI (gunicorn).
- `nutribuddy/asgi.py`: entree ASGI (si besoin).

### `foods/`
- `foods/__init__.py`: package.
- `foods/apps.py`: config app Django.
- `foods/models.py`: `FoodItem` + `ScanHistory`.
- `foods/admin.py`: admin Django (FoodItem, ScanHistory).
- `foods/serializers.py`: serializers DRF + `fodmap_matches`.
- `foods/views.py`: viewsets foods + scan-history.
- `foods/urls.py`: router DRF (`/api/foods/`, `/api/scan-history/`).
- `foods/filters.py`: filtres API (kcal/macros/compatibilites/allergens).
- `foods/fodmap.py`: listes + classifieur FODMAP.
- `foods/allergens.py`: regles allergens + detection/queries.
- `foods/compatibility_keywords.py`: mots cles FR/EN utilises pour le tagging CIQUAL.
- `foods/tests.py`: tests API (filtres/search/pagination/ordering).

### `foods/migrations/`
- `foods/migrations/__init__.py`: package migrations.
- `foods/migrations/0001_initial.py`: creation table FoodItem (V1).
- `foods/migrations/0002_fooditem_fiber_g_100g_fooditem_group_code_and_more.py`: ajout de champs nutrition/CIQUAL.
- `foods/migrations/0003_fooditem_source_remove_food_type.py`: introduction `source` et nettoyage.
- `foods/migrations/0003_remove_fooditem_irritable_bowel_and_more.py`: suppression ancien champ irritabilite V1.
- `foods/migrations/0004_alter_fooditem_barcode.py`: evolutions barcode.
- `foods/migrations/0005_alter_fooditem_carbs_g_100g_and_more.py`: ajustements champs nutrition.
- `foods/migrations/0006_merge_20260203_1033.py`: merge migrations concurrentes.
- `foods/migrations/0007_fooditem_openfoodfacts_fields.py`: champs Open Food Facts.
- `foods/migrations/0008_alter_fooditem_nutriscore_grade.py`: ajustement nutriscore.
- `foods/migrations/0009_alter_fooditem_quantity.py`: ajustement quantity.
- `foods/migrations/0010_alter_fooditem_name_and_brand.py`: ajustements name/brand.
- `foods/migrations/0011_alter_fooditem_barcode_text.py`: barcode en TextField.
- `foods/migrations/0012_alter_fooditem_irritability_level.py`: irritabilite en low/high/NULL.
- `foods/migrations/0013_scanhistory.py`: ajout modele `ScanHistory`.

### `foods/management/`
- `foods/management/__init__.py`: package.
- `foods/management/commands/__init__.py`: package.
- `foods/management/commands/import_ciqual.py`: import Excel CIQUAL.
- `foods/management/commands/import_openfoodfacts_minimal.py`: import JSONL minimal OFF.
- `foods/management/commands/tag_compatibilities.py`: tagging CIQUAL (group/subgroup + keywords + FODMAP).
- `foods/management/commands/tag_openfoodfacts_compatibilities.py`: tagging OFF (ingredients/labels/allergens + negations + FODMAP) avec batch update.
- `foods/management/commands/infer_allergens.py`: infere `allergens_tags` a partir de name/ingredients.
- `foods/management/commands/clean_foods.py`: detection/suppression de rows aberrantes.

### `users/`
- `users/__init__.py`: package.
- `users/apps.py`: config app Django.
- `users/models.py`: `UserProfile` (preferences).
- `users/serializers.py`: register + profile serializers.
- `users/views.py`: endpoints register + profile.
- `users/urls.py`: routes `/api/auth/register/` et `/api/auth/profile/`.
- `users/admin.py`: admin UserProfile.

### `users/migrations/`
- `users/migrations/__init__.py`: package migrations.
- `users/migrations/0001_initial.py`: creation UserProfile.
- `users/migrations/0002_alter_userprofile_irritability_level.py`: irritabilite en low/high/NULL.
- `users/migrations/0002_userprofile_allergens_filter.py`: champs allergens + filter.
- `users/migrations/0003_merge_20260205_1240.py`: merge migrations concurrentes.

### `scripts/`
- `scripts/deploy.ps1`: dev deploy (Windows).
- `scripts/deploy_prod.sh`: prod deploy (Linux).
- `scripts/deploy_prod.ps1`: prod deploy (Windows/PowerShell).
- `scripts/export_db.sh`: export DB (Linux).
- `scripts/export_db.ps1`: export DB (Windows).
- `scripts/restore_db.sh`: restore DB (Linux).
- `scripts/restore_db.ps1`: restore DB (Windows).
- `scripts/backup.sh`: boucle pg_dump + retention (service `backup`).
- `scripts/prepare_openfoodfacts_minimal.py`: cree un export OFF minimal FR/food.

### `frontend/`
- `frontend/Dockerfile`: image DEV frontend (next dev).
- `frontend/Dockerfile.prod`: image PROD frontend (build + next start).
- `frontend/.gitignore`: ignores frontend (node_modules, .next, etc.) quand on bosse dans `frontend/`.
- `frontend/package.json`: dependances + scripts npm.
- `frontend/package-lock.json`: lockfile npm.
- `frontend/tsconfig.json`: config TypeScript.
- `frontend/eslint.config.mjs`: config lint.
- `frontend/postcss.config.mjs`: config PostCSS (Tailwind).
- `frontend/next.config.ts`: config Next.js.
- `frontend/README.md`: doc frontend (si present).
- `frontend/public/file.svg`: asset demo Next.
- `frontend/public/globe.svg`: asset demo Next.
- `frontend/public/next.svg`: asset demo Next.
- `frontend/public/vercel.svg`: asset demo Next.
- `frontend/public/window.svg`: asset demo Next.
- `frontend/src/app/globals.css`: styles globaux / design system.
- `frontend/src/app/layout.tsx`: layout global + nav/footer + condition "profil" si connecte.
- `frontend/src/app/page.tsx`: page d'accueil.
- `frontend/src/app/foods/page.tsx`: page recherche + filtres + fiche produit.
- `frontend/src/app/scan/page.tsx`: page scan (ZXing) + ouverture fiche + ajout historique.
- `frontend/src/app/profile/page.tsx`: page profil + historique scans + edition preferences.
- `frontend/src/app/login/page.tsx`: login (JWT).
- `frontend/src/app/register/page.tsx`: inscription.
- `frontend/src/app/info/page.tsx`: transparence (sources/copyright/credits).
- `frontend/src/app/favicon.ico`: favicon.
- `frontend/src/lib/api.ts`: client HTTP + refresh token.
- `frontend/src/lib/auth.ts`: stockage tokens.
- `frontend/src/lib/allergens.ts`: logique allergens cote UI.

### `backups/`
- `backups/nutribuddy_20260203_145639.dump`: exemple de dump Postgres (peut etre lourd; idealement a ne pas versionner).

### `doc/`
- `doc/README.md`: index documentation.
- `doc/deploiement_dev.md`: guide dev.
- `doc/deploiement_prod.md`: guide prod NAS.
- `doc/architecture.md`: ce document.

## Fichiers et dossiers locaux (ignores)

- `.env`: variables dev (voir `.env.example`).
- `.env.prod`: variables prod (voir `.env.prod.example`).
- `data/`: datasets (CIQUAL/OFF, etc.), ignore par git.
- `frontend/node_modules/`, `frontend/.next/`: caches/build Next.
