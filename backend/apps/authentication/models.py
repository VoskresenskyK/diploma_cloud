from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    # 'username' (логин), 'email' и 'password' уже есть внутри AbstractUser с правильными типами!

    # Полное имя пользователя (VARCHAR)
    full_name = models.CharField(max_length=255, verbose_name="Полное имя")

    # Путь к хранилищу пользователя относительно общего пути (VARCHAR / TEXT)
    storage_path = models.CharField(max_length=500, blank=True, null=True, verbose_name="Путь к хранилищу")

    # Признак администратора (BOOLEAN).
    # В Django уже есть встроенное поле is_staff (доступ в админку) или is_superuser.
    # Но мы можем продублировать или явно использовать кастомное поле, если это требуется по заданию:
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