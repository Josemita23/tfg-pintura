from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("clients", "0002_client_owner"),
    ]

    operations = [
        migrations.AlterField(
            model_name="client",
            name="phone",
            field=models.CharField(max_length=20, verbose_name="Teléfono"),
        ),
        migrations.AddConstraint(
            model_name="client",
            constraint=models.UniqueConstraint(
                fields=("owner", "phone"),
                name="unique_client_phone_per_owner",
            ),
        ),
    ]
