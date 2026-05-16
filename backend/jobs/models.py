from django.core.exceptions import ValidationError
from django.db import models

from budgets.models import Budget
from clients.models import Client


class Job(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendiente"
        PLANNED = "PLANNED", "Planificado"
        IN_PROGRESS = "IN_PROGRESS", "En progreso"
        FINISHED = "FINISHED", "Finalizado"
        CANCELLED = "CANCELLED", "Cancelado"

    client = models.ForeignKey(
        Client,
        on_delete=models.PROTECT,
        related_name="jobs",
        verbose_name="Cliente",
    )
    budget = models.OneToOneField(
        Budget,
        on_delete=models.PROTECT,
        related_name="job",
        null=True,
        blank=True,
        verbose_name="Presupuesto",
    )

    title = models.CharField(max_length=150, verbose_name="Título")
    description = models.TextField(blank=True, verbose_name="Descripción")
    address = models.CharField(max_length=255, blank=True, verbose_name="Dirección")

    start_date = models.DateField(null=True, blank=True, verbose_name="Fecha de inicio")
    end_date = models.DateField(null=True, blank=True, verbose_name="Fecha de fin")
    start_time = models.TimeField(null=True, blank=True, verbose_name="Hora de inicio")
    end_time = models.TimeField(null=True, blank=True, verbose_name="Hora de fin")

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name="Estado",
    )

    notes = models.TextField(blank=True, verbose_name="Observaciones")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Última actualización")

    class Meta:
        ordering = ["-start_date", "-created_at"]
        verbose_name = "Trabajo"
        verbose_name_plural = "Trabajos"

    def __str__(self):
        return self.title

    def clean(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValidationError("La fecha de fin no puede ser anterior a la fecha de inicio.")

        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValidationError("La hora de fin debe ser posterior a la hora de inicio.")
