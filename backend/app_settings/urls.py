from django.urls import path

from .views import AppSettingsView

urlpatterns = [
    path("", AppSettingsView.as_view(), name="app-settings"),
]