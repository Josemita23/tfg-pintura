from django.contrib import admin

from .models import Material, MaterialConsumption


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "material_type",
        "provider",
        "quantity_available",
        "minimum_stock",
        "unit",
        "unit_price",
        "status",
    )
    search_fields = ("name", "material_type", "provider")
    list_filter = ("status", "material_type", "provider")
    ordering = ("name",)


@admin.register(MaterialConsumption)
class MaterialConsumptionAdmin(admin.ModelAdmin):
    list_display = ("job", "material", "quantity", "consumption_date", "created_at")
    search_fields = ("job__title", "material__name")
    list_filter = ("consumption_date", "material")
    ordering = ("-consumption_date", "-created_at")