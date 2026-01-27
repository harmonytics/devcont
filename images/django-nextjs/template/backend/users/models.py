from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    """
    Default custom user model for Backend.
    If adding fields that need to be filled at user signup,
    check forms.SignupForm and forms.SocialSignupForm accordingly.
    """

    # Remove username field, use email instead
    username = None
    email = models.EmailField("email address", unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return self.email
