from django.contrib import admin

from .models import Job


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "client",
        "budget",
        "start_date",
        "end_date",
        "status",
        "created_at",
    )
    search_fields = (
        "title",
        "client__first_name",
        "client__last_name",
        "client__phone",
        "budget__code",
    )
    list_filter = ("status", "start_date", "created_at")
    ordering = ("-start_date", "-created_at")