from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from foods.allergens import detect_allergen_tags
from foods.models import FoodItem


class Command(BaseCommand):
    help = "Infer allergens_tags from ingredients or name when allergens_tags is empty."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Parse only, no DB writes")
        parser.add_argument("--limit", type=int, default=None, help="Limit number of rows")
        parser.add_argument(
            "--include-non-empty",
            action="store_true",
            help="Also update rows where allergens_tags already has values.",
        )
        parser.add_argument(
            "--log-every",
            type=int,
            default=0,
            help="Log progress every N rows (0 disables).",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        limit = options["limit"]
        include_non_empty = options["include_non_empty"]
        log_every = options["log_every"]

        qs = FoodItem.objects.all().only(
            "id",
            "name",
            "ingredients_text",
            "ingredients_text_fr",
            "allergens_tags",
        )
        if not include_non_empty:
            qs = qs.filter(allergens_tags=[])
        if limit:
            qs = qs[:limit]

        processed = 0
        updated = 0
        skipped = 0

        with transaction.atomic():
            for item in qs:
                processed += 1

                existing = set(item.allergens_tags or [])
                if not include_non_empty and existing:
                    skipped += 1
                    continue

                detected = set(
                    detect_allergen_tags(
                        item.name, item.ingredients_text, item.ingredients_text_fr
                    )
                )
                if not detected:
                    skipped += 1
                    continue

                if include_non_empty:
                    combined = sorted(existing | detected)
                else:
                    combined = sorted(detected)

                if combined == list(item.allergens_tags or []):
                    skipped += 1
                    continue

                item.allergens_tags = combined
                item.save(update_fields=["allergens_tags"])
                updated += 1

                if log_every and processed % log_every == 0:
                    self.stdout.write(
                        f"processed={processed} updated={updated} skipped={skipped}"
                    )

            if dry_run:
                raise CommandError(
                    f"Dry run requested. processed={processed}, updated={updated}, skipped={skipped}"
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. processed={processed}, updated={updated}, skipped={skipped}"
            )
        )
