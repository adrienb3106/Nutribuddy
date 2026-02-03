from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models


class FoodItem(models.Model):
    class Source(models.TextChoices):
        CIQUAL = "ciqual", "Ciqual"
        OPENFOODFACTS = "openfoodfacts", "Open Food Facts"
        MANUAL = "manual", "Manual"

    name = models.CharField(max_length=255)
    source = models.CharField(max_length=32, choices=Source.choices, default=Source.MANUAL)

    kcal_100g = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(1000)],
    )
    protein_g_100g = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    carbs_g_100g = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    fat_g_100g = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )

    sugars_g_100g = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True,
        blank=True,
    )
    fiber_g_100g = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True,
        blank=True,
    )
    saturated_fat_g_100g = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True,
        blank=True,
    )
    salt_g_100g = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True,
        blank=True,
    )
    water_g_100g = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True,
        blank=True,
    )

    vegan = models.BooleanField(default=False)
    vegetarian = models.BooleanField(default=False)
    pescetarian = models.BooleanField(default=False)
    irritability_level = models.PositiveSmallIntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(3)]
    )
    gluten_free = models.BooleanField(default=False)
    lactose_free = models.BooleanField(default=False)

    barcode = models.CharField(
        max_length=32,
        unique=True,
        null=True,
        blank=True,
        validators=[
            RegexValidator(r"^\d{8,14}$", "Barcode must be 8 to 14 digits (EAN/GTIN).")
        ],
    )

    source_code = models.CharField(max_length=32, unique=True, null=True, blank=True)
    group_code = models.IntegerField(null=True, blank=True)
    subgroup_code = models.IntegerField(null=True, blank=True)
    subsubgroup_code = models.IntegerField(null=True, blank=True)
    group_name = models.CharField(max_length=255, null=True, blank=True)
    subgroup_name = models.CharField(max_length=255, null=True, blank=True)
    subsubgroup_name = models.CharField(max_length=255, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["name"], name="fooditem_name_idx"),
            models.Index(fields=["barcode"], name="fooditem_barcode_idx"),
        ]

    def save(self, *args, **kwargs):
        # Enforce logical consistency for dietary flags.
        if self.vegan:
            self.vegetarian = True
            self.pescetarian = True
        elif self.vegetarian:
            self.pescetarian = True
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name
