from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    full_name = models.CharField(max_length=255, verbose_name="Полное имя")
    storage_path = models.CharField(max_length=500, blank=True, null=True, verbose_name="Путь к хранилищу")
    is_admin = models.BooleanField(default=False, verbose_name="Признак администратора")
