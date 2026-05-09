from django.contrib import admin

from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "phone", "email", "status", "created_at")
    search_fields = ("first_name", "last_name", "phone", "email")
    list_filter = ("status", "created_at")
    ordering = ("first_name", "last_name")