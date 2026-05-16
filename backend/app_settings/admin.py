from django.contrib import admin

from .models import AppSettings


@admin.register(AppSettings)
class AppSettingsAdmin(admin.ModelAdmin):
    list_display = (
        "owner",
        "default_start_time",
        "default_end_time",
        "low_stock_threshold",
        "upcoming_job_days",
        "updated_at",
    )
    search_fields = ("owner__username", "owner__email")