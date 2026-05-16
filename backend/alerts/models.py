from django.conf import settings
from django.db import models

from jobs.models import Job
from materials.models import Material
from planning.models import CalendarEvent


class Alert(models.Model):
    class AlertType(models.TextChoices):
        LOW_STOCK = "LOW_STOCK", "Stock bajo"
        OUT_OF_STOCK = "OUT_OF_STOCK", "Sin stock"
        JOB_REMINDER = "JOB_REMINDER", "Recordatorio de trabajo"
        OVERLAP = "OVERLAP", "Solapamiento"
        BUDGET_PENDING = "BUDGET_PENDING", "Presupuesto pendiente"
        GENERAL = "GENERAL", "General"

    class Priority(models.TextChoices):
        LOW = "LOW", "Baja"
        MEDIUM = "MEDIUM", "Media"
        HIGH = "HIGH", "Alta"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="alerts",
        null=True,
        blank=True,
        verbose_name="Usuario",
    )
    alert_type = models.CharField(
        max_length=30,
        choices=AlertType.choices,
        default=AlertType.GENERAL,
        verbose_name="Tipo de alerta",
    )

    title = models.CharField(max_length=150, verbose_name="Título")
    description = models.TextField(blank=True, verbose_name="Descripción")

    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.MEDIUM,
        verbose_name="Prioridad",
    )

    is_read = models.BooleanField(default=False, verbose_name="Leída")

    material = models.ForeignKey(
        Material,
        on_delete=models.CASCADE,
        related_name="alerts",
        null=True,
        blank=True,
        verbose_name="Material",
    )

    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="alerts",
        null=True,
        blank=True,
        verbose_name="Trabajo",
    )

    calendar_event = models.ForeignKey(
        CalendarEvent,
        on_delete=models.CASCADE,
        related_name="alerts",
        null=True,
        blank=True,
        verbose_name="Evento de calendario",
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Última actualización")

    class Meta:
        ordering = ["is_read", "-created_at"]
        verbose_name = "Alerta"
        verbose_name_plural = "Alertas"

    def __str__(self):
        return self.title
