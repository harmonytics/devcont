from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

from .managers import UserManager


class User(AbstractUser):
    """
    Default custom user model for Backend.
    If adding fields that need to be filled at user signup,
    check forms.UserSignupForm and forms.UserSocialSignupForm accordingly.
    """

    # Remove username field, use email instead
    username = None  # type: ignore[assignment]
    email = models.EmailField(_("email address"), unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects: UserManager = UserManager()

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")

    def __str__(self):
        return self.email
