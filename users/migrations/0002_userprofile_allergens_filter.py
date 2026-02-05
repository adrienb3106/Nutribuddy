from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="allergens",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="filter_allergens",
            field=models.BooleanField(default=False),
        ),
    ]
