from django.contrib import admin

from .models import Budget, BudgetItem


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