from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from jobs.models import Job


class Material(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Disponible"
        LOW_STOCK = "LOW_STOCK", "Stock bajo"
        OUT_OF_STOCK = "OUT_OF_STOCK", "Agotado"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="materials",
        null=True,
        blank=True,
        verbose_name="Usuario",
    )
    name = models.CharField(max_length=150, verbose_name="Nombre")
    material_type = models.CharField(max_length=100, blank=True, verbose_name="Tipo")
    provider = models.CharField(max_length=150, blank=True, verbose_name="Proveedor")

    quantity_available = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Cantidad disponible",
    )
    minimum_stock = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Stock mínimo",
    )
    unit = models.CharField(max_length=50, default="unidad", verbose_name="Unidad de medida")

    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Precio unitario",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.AVAILABLE,
        verbose_name="Estado",
    )

    notes = models.TextField(blank=True, verbose_name="Observaciones")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Última actualización")

    class Meta:
        ordering = ["name"]
        verbose_name = "Material"
        verbose_name_plural = "Materiales"

    def __str__(self):
        return self.name

    def clean(self):
        if self.quantity_available < 0:
            raise ValidationError("La cantidad disponible no puede ser negativa.")

        if self.minimum_stock < 0:
            raise ValidationError("El stock mínimo no puede ser negativo.")

        if self.unit_price < 0:
            raise ValidationError("El precio unitario no puede ser negativo.")

    def update_status(self):
        if self.quantity_available <= 0:
            self.status = self.Status.OUT_OF_STOCK
        elif self.quantity_available <= self.minimum_stock:
            self.status = self.Status.LOW_STOCK
        else:
            self.status = self.Status.AVAILABLE

    def save(self, *args, **kwargs):
        self.update_status()
        super().save(*args, **kwargs)


class MaterialConsumption(models.Model):
    job = models.ForeignKey(
        Job,
        on_delete=models.PROTECT,
        related_name="material_consumptions",
        verbose_name="Trabajo",
    )
    material = models.ForeignKey(
        Material,
        on_delete=models.PROTECT,
        related_name="consumptions",
        verbose_name="Material",
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Cantidad consumida",
    )
    consumption_date = models.DateField(verbose_name="Fecha de consumo")
    notes = models.TextField(blank=True, verbose_name="Observaciones")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Última actualización")

    class Meta:
        ordering = ["-consumption_date", "-created_at"]
        verbose_name = "Consumo de material"
        verbose_name_plural = "Consumos de materiales"

    def __str__(self):
        return f"{self.material} - {self.quantity} {self.material.unit}"

    def clean(self):
        if self.quantity <= 0:
            raise ValidationError("La cantidad consumida debe ser mayor que cero.")

        if not self.pk and self.quantity > self.material.quantity_available:
            raise ValidationError("No hay suficiente stock disponible para registrar este consumo.")

    def save(self, *args, **kwargs):
        self.full_clean()

        if self.pk:
            old_consumption = MaterialConsumption.objects.get(pk=self.pk)

            if old_consumption.material_id == self.material_id:
                difference = self.quantity - old_consumption.quantity

                if difference > self.material.quantity_available:
                    raise ValidationError("No hay suficiente stock disponible para actualizar este consumo.")

                self.material.quantity_available -= difference
                self.material.save()
            else:
                old_material = old_consumption.material
                old_material.quantity_available += old_consumption.quantity
                old_material.save()

                if self.quantity > self.material.quantity_available:
                    raise ValidationError("No hay suficiente stock disponible para registrar este consumo.")

                self.material.quantity_available -= self.quantity
                self.material.save()
        else:
            self.material.quantity_available -= self.quantity
            self.material.save()

        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        material = self.material
        material.quantity_available += self.quantity
        material.save()
        super().delete(*args, **kwargs)
