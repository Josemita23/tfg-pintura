from decimal import Decimal

from django.conf import settings
from django.db import models

from clients.models import Client


class Budget(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Borrador"
        PENDING = "PENDING", "Pendiente"
        ACCEPTED = "ACCEPTED", "Aceptado"
        REJECTED = "REJECTED", "Rechazado"
        CONVERTED = "CONVERTED", "Convertido en trabajo"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="budgets",
        null=True,
        blank=True,
        verbose_name="Usuario",
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.PROTECT,
        related_name="budgets",
        verbose_name="Cliente",
    )
    code = models.CharField(max_length=30, unique=True, verbose_name="Código")
    description = models.TextField(blank=True, verbose_name="Descripción")
    date = models.DateField(verbose_name="Fecha")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        verbose_name="Estado",
    )

    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Subtotal",
    )
    vat_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("21.00"),
        verbose_name="IVA (%)",
    )
    vat_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Importe IVA",
    )
    total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Total",
    )

    notes = models.TextField(blank=True, verbose_name="Observaciones")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Última actualización")

    class Meta:
        ordering = ["-date", "-created_at"]
        verbose_name = "Presupuesto"
        verbose_name_plural = "Presupuestos"

    def __str__(self):
        return f"{self.code} - {self.client}"

    def recalculate_totals(self):
        subtotal = sum(item.amount for item in self.items.all())
        vat_amount = subtotal * (self.vat_percentage / Decimal("100"))
        total = subtotal + vat_amount

        self.subtotal = subtotal
        self.vat_amount = vat_amount
        self.total = total
        self.save(update_fields=["subtotal", "vat_amount", "total", "updated_at"])


class BudgetItem(models.Model):
    budget = models.ForeignKey(
        Budget,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Presupuesto",
    )
    description = models.CharField(max_length=255, verbose_name="Descripción")
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("1.00"),
        verbose_name="Cantidad",
    )
    unit = models.CharField(max_length=50, default="unidad", verbose_name="Unidad")
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Precio unitario",
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Importe",
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Última actualización")

    class Meta:
        ordering = ["id"]
        verbose_name = "Concepto de presupuesto"
        verbose_name_plural = "Conceptos de presupuesto"

    def __str__(self):
        return self.description

    def save(self, *args, **kwargs):
        self.amount = self.quantity * self.unit_price
        super().save(*args, **kwargs)

        if self.budget_id:
            self.budget.recalculate_totals()

    def delete(self, *args, **kwargs):
        budget = self.budget
        super().delete(*args, **kwargs)
        budget.recalculate_totals()


class BudgetBasePrice(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="budget_base_prices",
        null=True,
        blank=True,
        verbose_name="Usuario",
    )
    name = models.CharField(max_length=120, verbose_name="Tipo de trabajo")
    description = models.CharField(max_length=255, verbose_name="Descripcion para presupuesto")
    unit = models.CharField(max_length=50, default="m2", verbose_name="Unidad")
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Precio referencia",
    )
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creacion")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Ultima actualizacion")

    class Meta:
        ordering = ["name"]
        verbose_name = "Precio base"
        verbose_name_plural = "Precios base"
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "name"],
                name="unique_budget_base_price_per_owner",
            )
        ]

    def __str__(self):
        return f"{self.name} - {self.unit_price} €/{self.unit}"
