from django.contrib import admin

from .models import Alert


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "alert_type",
        "priority",
        "is_read",
        "material",
        "job",
        "calendar_event",
        "created_at",
    )
    search_fields = ("title", "description", "material__name", "job__title")
    list_filter = ("alert_type", "priority", "is_read", "created_at")
    ordering = ("is_read", "-created_at")