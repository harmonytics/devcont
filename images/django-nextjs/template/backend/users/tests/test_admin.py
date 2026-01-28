import pytest
from django.urls import reverse

from .factories import UserFactory


@pytest.mark.django_db
class TestUserAdmin:
    def test_changelist(self, admin_client):
        url = reverse("admin:users_user_changelist")
        response = admin_client.get(url)
        assert response.status_code == 200

    def test_add(self, admin_client):
        url = reverse("admin:users_user_add")
        response = admin_client.get(url)
        assert response.status_code == 200

    def test_change(self, admin_client):
        user = UserFactory()
        url = reverse("admin:users_user_change", kwargs={"object_id": user.pk})
        response = admin_client.get(url)
        assert response.status_code == 200
