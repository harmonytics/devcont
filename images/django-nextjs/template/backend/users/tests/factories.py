from django.contrib.auth import get_user_model
from factory import Faker, PostGenerationMethodCall
from factory.django import DjangoModelFactory

User = get_user_model()


class UserFactory(DjangoModelFactory):
    email = Faker("email")
    first_name = Faker("first_name")
    last_name = Faker("last_name")
    password = PostGenerationMethodCall("set_password", "testpass123")

    class Meta:
        model = User
        django_get_or_create = ["email"]

    @classmethod
    def _after_postgeneration(cls, instance, create, results=None):
        """Save again after PostGenerationMethodCall."""
        if create:
            instance.save()
