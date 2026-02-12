#!/usr/bin/env python
import argparse
import gzip
import json
from pathlib import Path
from typing import Any


def _open_text(path: Path, mode: str):
    if path.suffix == ".gz":
        return gzip.open(path, mode + "t", encoding="utf-8")
    return path.open(mode, encoding="utf-8")


def _as_list(value: Any) -> list:
    if isinstance(value, list):
        return value
    if value is None:
        return []
    if isinstance(value, str):
        items = [item.strip() for item in value.split(",")]
        return [item for item in items if item]
    return [value]


def _clean_str(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return str(value)


def _first_value(*values: Any) -> Any:
    for value in values:
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        return value
    return None


def _tokens(value: Any) -> set[str]:
    tokens: set[str] = set()
    if isinstance(value, list):
        for item in value:
            if isinstance(item, str):
                item = item.strip().lower()
                if item:
                    tokens.add(item)
    elif isinstance(value, str):
        for item in value.split(","):
            item = item.strip().lower()
            if item:
                tokens.add(item)
    return tokens


def _is_food(product: dict, keep_unknown_type: bool) -> bool:
    product_type = product.get("product_type")
    if product_type is None:
        return keep_unknown_type
    return str(product_type).strip().lower() == "food"


def _is_france(product: dict) -> bool:
    tokens = set()
    tokens |= _tokens(product.get("countries_tags"))
    tokens |= _tokens(product.get("countries_hierarchy"))
    tokens |= _tokens(product.get("countries"))
    if "france" in tokens:
        return True
    for token in tokens:
        if token.endswith(":france"):
            return True
    return False


def _num(value: Any) -> int | float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return None
        try:
            if "." in value:
                return float(value)
            return int(value)
        except ValueError:
            return None
    return None


def _round_completeness(value: Any) -> float | None:
    try:
        return round(float(value), 4)
    except (TypeError, ValueError):
        return None


def _pick_name(product: dict) -> str | None:
    return _clean_str(
        _first_value(
            product.get("product_name"),
            product.get("product_name_fr"),
            product.get("generic_name"),
            product.get("generic_name_fr"),
        )
    )


def _pick_brand(product: dict) -> str | None:
    return _clean_str(_first_value(product.get("brands"), product.get("brand")))


def _pick_quantity(product: dict) -> str | None:
    quantity = _clean_str(product.get("quantity"))
    if quantity:
        return quantity
    amount = _clean_str(product.get("product_quantity"))
    unit = _clean_str(product.get("product_quantity_unit"))
    if amount and unit:
        return f"{amount} {unit}"
    return amount


def _pick_barcode(product: dict) -> str | None:
    return _clean_str(_first_value(product.get("code"), product.get("_id"), product.get("id")))


def _build_minimal(product: dict) -> dict:
    nutriments = product.get("nutriments") or {}
    nutriments_100g = {
        "energy_kcal": _num(_first_value(nutriments.get("energy-kcal_100g"), nutriments.get("energy-kcal"))),
        "fat_g": _num(_first_value(nutriments.get("fat_100g"), nutriments.get("fat"))),
        "saturated_fat_g": _num(
            _first_value(nutriments.get("saturated-fat_100g"), nutriments.get("saturated-fat"))
        ),
        "carbs_g": _num(_first_value(nutriments.get("carbohydrates_100g"), nutriments.get("carbohydrates"))),
        "sugars_g": _num(_first_value(nutriments.get("sugars_100g"), nutriments.get("sugars"))),
        "protein_g": _num(_first_value(nutriments.get("proteins_100g"), nutriments.get("proteins"))),
        "salt_g": _num(_first_value(nutriments.get("salt_100g"), nutriments.get("salt"))),
    }

    nutriscore = {
        "grade": _clean_str(_first_value(product.get("nutriscore_grade"), product.get("nutrition_grades"))),
        "score": _num(product.get("nutriscore_score")),
        "version": _clean_str(product.get("nutriscore_version")),
    }

    return {
        "barcode": _pick_barcode(product),
        "name": _pick_name(product),
        "brand": _pick_brand(product),
        "quantity": _pick_quantity(product),
        "categories_tags": _as_list(product.get("categories_tags")),
        "allergens_tags": _as_list(product.get("allergens_tags")),
        "labels_tags": _as_list(product.get("labels_tags")),
        "ingredients": {
            "text_fr": _clean_str(product.get("ingredients_text_fr")),
            "text": _clean_str(product.get("ingredients_text")),
            "analysis_tags": _as_list(product.get("ingredients_analysis_tags")),
            "from_palm_oil_tags": _as_list(product.get("ingredients_from_palm_oil_tags")),
            "may_be_from_palm_oil_tags": _as_list(product.get("ingredients_that_may_be_from_palm_oil_tags")),
        },
        "nutrition_per": _clean_str(
            _first_value(product.get("nutrition_data_per"), product.get("nutrition_data_prepared_per"))
        ),
        "nutriments_100g": nutriments_100g,
        "nutrient_levels": product.get("nutrient_levels") or {},
        "nutriscore": nutriscore,
        "source_last_updated_t": _first_value(product.get("last_updated_t"), product.get("last_modified_t")),
        "source_completeness": _round_completeness(product.get("completeness")),
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Filter OpenFoodFacts JSONL (.gz) to food products in France "
            "and keep only a minimal subset of fields."
        )
    )
    parser.add_argument(
        "--input",
        default="data/openfoodfacts-products.jsonl.gz",
        help="Path to the input JSONL or JSONL.GZ file.",
    )
    parser.add_argument(
        "--output",
        default="data/openfoodfacts-products.fr.food.min.jsonl.gz",
        help="Path to the output JSONL or JSONL.GZ file.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional limit on the number of exported rows.",
    )
    parser.add_argument(
        "--log-every",
        type=int,
        default=0,
        help="Log progress every N lines (0 disables).",
    )
    parser.add_argument(
        "--keep-unknown-type",
        action="store_true",
        help="Keep records where product_type is missing.",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    total = 0
    written = 0
    bad_json = 0

    with _open_text(input_path, "r") as reader, _open_text(output_path, "w") as writer:
        for line in reader:
            if args.limit is not None and written >= args.limit:
                break
            line = line.strip()
            if not line:
                continue
            total += 1
            try:
                product = json.loads(line)
            except json.JSONDecodeError:
                bad_json += 1
                continue

            if not _is_food(product, args.keep_unknown_type):
                continue
            if not _is_france(product):
                continue

            minimal = _build_minimal(product)
            writer.write(json.dumps(minimal, ensure_ascii=False) + "\n")
            written += 1

            if args.log_every and total % args.log_every == 0:
                print(f"processed={total} written={written} bad_json={bad_json}")

    print(f"done processed={total} written={written} bad_json={bad_json}")


if __name__ == "__main__":
    main()
