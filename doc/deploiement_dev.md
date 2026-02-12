# Deploiement dev (local)

Ce guide decrit comment lancer Nutribuddy en local pour developper.

## Prerequis

- Docker Desktop (Compose v2)
- PowerShell (recommande sous Windows)
- Optionnel: Node.js 18+ si tu veux lancer le frontend hors Docker

## Option 1 (recommandee): script "tout-en-un"

Le script `scripts/deploy.ps1`:
- demarre les conteneurs (dev)
- attend Postgres
- applique les migrations
- importe CIQUAL et/ou Open Food Facts (minimal)
- applique les tags (compatibilites)

Commande:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1
```

Options utiles:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1 -SkipOff
```
```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1 -SkipTags
```
```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1 -OnlyIfDefault
```

## Option 2: demarrage manuel

1) Configuration
```bash
cp .env.example .env
```

2) Lancer la stack dev
```bash
docker compose up --build
```

3) Migrations
```bash
docker compose exec web python manage.py migrate
```

4) Admin Django
```bash
docker compose exec web python manage.py createsuperuser
```

5) Imports (optionnels)
CIQUAL:
```bash
docker compose exec web python manage.py import_ciqual --path "data/Table Ciqual 2025_FR_2025_11_03.xls"
```

Open Food Facts minimal:
```bash
docker compose exec web python manage.py import_openfoodfacts_minimal --path "data/openfoodfacts-products.fr.food.min.jsonl.gz"
```

6) Tagging (optionnel)
```bash
docker compose exec web python manage.py tag_compatibilities
```
```bash
docker compose exec web python manage.py tag_openfoodfacts_compatibilities --log-every 10000
```

## URLs dev

- Backend: `http://localhost:8000/` (API: `http://localhost:8000/api/`, admin: `http://localhost:8000/admin/`)
- Frontend: `http://localhost:3000/`

## Tests

```bash
docker compose exec web python manage.py test foods
```

## Notes importantes

- Le fichier `docker-compose.yml` est une stack DEV (serveurs de dev Django/Next, volumes montes, etc.). Ne pas exposer ces ports sur Internet.
- La DB est exposee sur `5432` en dev pour faciliter le debug. Ne pas ouvrir ce port en dehors du poste de dev.
- Les fichiers `.env` et les datasets dans `data/` sont ignores par git (voir `.gitignore`).

