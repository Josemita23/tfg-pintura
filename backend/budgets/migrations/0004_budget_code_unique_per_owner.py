from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("budgets", "0003_budgetbaseprice"),
    ]

    operations = [
        migrations.AlterField(
            model_name="budget",
            name="code",
            field=models.CharField(max_length=30, verbose_name="Código"),
        ),
        migrations.AddConstraint(
            model_name="budget",
            constraint=models.UniqueConstraint(
                fields=("owner", "code"),
                name="unique_budget_code_per_owner",
            ),
        ),
    ]
