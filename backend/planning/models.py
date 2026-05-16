from django.core.exceptions import ValidationError
from django.conf import settings
from django.db import models

from jobs.models import Job
from .overlap import find_overlapping_calendar_events


class CalendarEvent(models.Model):
    class EventType(models.TextChoices):
        VISIT = "VISIT", "Visita"
        JOB = "JOB", "Trabajo"
        REMINDER = "REMINDER", "Recordatorio"

    class Status(models.TextChoices):
        PLANNED = "PLANNED", "Planificado"
        COMPLETED = "COMPLETED", "Completado"
        CANCELLED = "CANCELLED", "Cancelado"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="calendar_events",
        null=True,
        blank=True,
        verbose_name="Usuario",
    )
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="calendar_events",
        null=True,
        blank=True,
        verbose_name="Trabajo",
    )

    title = models.CharField(max_length=150, verbose_name="Título")
    event_type = models.CharField(
        max_length=20,
        choices=EventType.choices,
        default=EventType.JOB,
        verbose_name="Tipo de evento",
    )

    start_at = models.DateTimeField(verbose_name="Fecha y hora de inicio")
    end_at = models.DateTimeField(verbose_name="Fecha y hora de fin")

    location = models.CharField(max_length=255, blank=True, verbose_name="Ubicación")
    description = models.TextField(blank=True, verbose_name="Descripción")

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PLANNED,
        verbose_name="Estado",
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Última actualización")

    class Meta:
        ordering = ["start_at"]
        verbose_name = "Evento de calendario"
        verbose_name_plural = "Eventos de calendario"

    def __str__(self):
        return self.title

    def clean(self):
        if self.end_at <= self.start_at:
            raise ValidationError("La fecha y hora de fin debe ser posterior a la de inicio.")

        overlapping_events = find_overlapping_calendar_events(
            CalendarEvent,
            self.start_at,
            self.end_at,
            self,
        )

        if overlapping_events:
            raise ValidationError("Ya existe un evento planificado en ese intervalo de tiempo.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
