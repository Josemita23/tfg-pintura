from django.contrib import admin

from .models import Budget, BudgetBasePrice, BudgetItem


class BudgetItemInline(admin.TabularInline):
    model = BudgetItem
    extra = 1


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ("code", "client", "date", "status", "subtotal", "vat_amount", "total")
    search_fields = ("code", "client__first_name", "client__last_name", "client__phone")
    list_filter = ("status", "date")
    inlines = [BudgetItemInline]


@admin.register(BudgetItem)
class BudgetItemAdmin(admin.ModelAdmin):
    list_display = ("budget", "description", "quantity", "unit", "unit_price", "amount")
    search_fields = ("description", "budget__code")


@admin.register(BudgetBasePrice)
class BudgetBasePriceAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "unit_price", "unit", "is_active")
    list_filter = ("is_active", "unit")
    search_fields = ("name", "description", "owner__username")
