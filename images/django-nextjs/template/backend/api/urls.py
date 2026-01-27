from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health_check, name="health-check"),
    path("users/me/", views.current_user, name="current-user"),
]
