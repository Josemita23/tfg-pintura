"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path

from .auth_views import login_view, profile_view, register_view


def health_check(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/health/", health_check),
    path("api/auth/login/", login_view),
    path("api/auth/register/", register_view),
    path("api/auth/profile/", profile_view),

    path("api/clients/", include("clients.urls")),
    path("api/budgets/", include("budgets.urls")),
    path("api/jobs/", include("jobs.urls")),
    path("api/materials/", include("materials.urls")),
    path("api/planning/", include("planning.urls")),
    path("api/alerts/", include("alerts.urls")),
    path("api/app-settings/", include("app_settings.urls")),
]
