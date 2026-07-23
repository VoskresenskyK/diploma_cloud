from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    full_name = models.CharField(max_length=255, verbose_name="Полное имя")
    storage_path = models.CharField(max_length=500, blank=True, null=True, verbose_name="Путь к хранилищу")
    is_admin = models.BooleanField(default=False, verbose_name="Признак администратора")

    def save(self, *args, **kwargs):
        # Автоматически проставляем признак админа, если пользователя делают суперюзером
        if self.is_superuser:
            self.is_admin = True

        # Автоматическая генерация пути к хранилищу на основе логина (если путь еще не задан)
        if not self.storage_path and self.username:
            self.storage_path = f"user_{self.username}/"

        super().save(*args, **kwargs)

    def __str__(self):
        return self.username