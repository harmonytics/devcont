from .factories import UserFactory


class TestUserModel:
    def test_user_str(self, db):
        user = UserFactory()
        assert str(user) == user.email
