from datetime import time

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class AppSettings(models.Model):
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="app_settings",
        verbose_name="Usuario",
    )

    default_start_time = models.TimeField(
        default=time(9, 0),
        verbose_name="Hora de inicio por defecto",
    )

    default_end_time = models.TimeField(
        default=time(18, 0),
        verbose_name="Hora de fin por defecto",
    )

    low_stock_threshold = models.PositiveIntegerField(
        default=5,
        verbose_name="Stock bajo por defecto",
    )

    upcoming_job_days = models.PositiveIntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(365)],
        verbose_name="Dias de aviso previo para trabajos proximos",
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Ultima actualizacion",
    )

    class Meta:
        verbose_name = "Configuracion de usuario"
        verbose_name_plural = "Configuraciones de usuario"

    def __str__(self):
        return f"Configuracion de {self.owner}"