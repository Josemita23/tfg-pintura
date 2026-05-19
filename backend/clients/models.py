from django.conf import settings
from django.db import models


class Client(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Activo"
        INACTIVE = "INACTIVE", "Inactivo"
        POTENTIAL = "POTENTIAL", "Potencial"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="clients",
        null=True,
        blank=True,
        verbose_name="Usuario",
    )
    first_name = models.CharField(max_length=100, verbose_name="Nombre")
    last_name = models.CharField(max_length=150, blank=True, verbose_name="Apellidos")
    phone = models.CharField(max_length=20, verbose_name="Teléfono")
    email = models.EmailField(blank=True, null=True, unique=True, verbose_name="Email")
    address = models.CharField(max_length=255, blank=True, verbose_name="Dirección")
    notes = models.TextField(blank=True, verbose_name="Observaciones")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        verbose_name="Estado",
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Última actualización")

    class Meta:
        ordering = ["first_name", "last_name"]
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "phone"],
                name="unique_client_phone_per_owner",
            )
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name}".strip()
