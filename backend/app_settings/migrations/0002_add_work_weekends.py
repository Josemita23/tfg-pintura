from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app_settings", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="appsettings",
            name="work_weekends",
            field=models.BooleanField(
                default=True,
                verbose_name="Trabajar fines de semana",
                help_text="Permite incluir sábados y domingos en la planificación de eventos.",
            ),
        ),
    ]
