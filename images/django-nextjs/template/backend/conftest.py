import pytest

from users.tests.factories import UserFactory


@pytest.fixture(autouse=True)
def _media_storage(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path / "media"


@pytest.fixture
def user(db):
    return UserFactory()


@pytest.fixture
def admin_user(db):
    return UserFactory(is_staff=True, is_superuser=True)


@pytest.fixture
def admin_client(client, admin_user):
    client.force_login(admin_user)
    return client


@pytest.fixture
def authenticated_client(client, user):
    client.force_login(user)
    return client
