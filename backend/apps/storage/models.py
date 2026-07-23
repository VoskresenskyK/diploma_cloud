from django.db import models
from django.contrib.auth import get_user_model
import os
import uuid
import secrets

User = get_user_model()


def get_unique_upload_path(instance, filename):
    """
    Файлы сохраняются под уникальными UUID-именами в изолированных
    папках пользователей относительно общего пути CLOUD_STORAGE_BASE_DIR.
    Это полностью исключает конфликты имен (по ТЗ).
    """
    ext = filename.split('.')[-1]
    unique_filename = f"{uuid.uuid4()}.{ext}"
    # Структура: user_storages/user_<username>/<uuid>.<ext>
    return os.path.join(f"user_{instance.user.username}", unique_filename)


class UserFile(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='files', verbose_name="Владелец")
    file = models.FileField(upload_to=get_unique_upload_path, verbose_name="Физический файл на диске")
    filename = models.CharField(max_length=255, verbose_name="Оригинальное имя файла")
    size = models.BigIntegerField(verbose_name="Размер файла в байтах")
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата загрузки")
    last_downloaded_at = models.DateTimeField(blank=True, null=True, verbose_name="Последняя дата скачивания")
    comment = models.TextField(blank=True, null=True, verbose_name="Комментарий")
    path_in_storage = models.CharField(max_length=500, blank=True, verbose_name="Путь к файлу в хранилище")
    share_token = models.CharField(max_length=100, unique=True, blank=True, null=True)
    special_link = models.CharField(max_length=500, blank=True, verbose_name="Специальная обезличенная ссылка")

    def save(self, *args, **kwargs):
        # Генерируем случайный токен для обезличенной ссылки
        if not self.share_token:
            self.share_token = secrets.token_urlsafe(24)
            # Ссылка максимально обезличена: не содержит имени, хранилища и оригинального имени файла
            self.special_link = f"http://127.0.0{self.share_token}/"

        super().save(*args, **kwargs)

        # После сохранения файла записываем его относительный путь в хранилище
        if self.file and not self.path_in_storage:
            self.path_in_storage = self.file.name
            super().save(update_fields=['path_in_storage'])

    def __str__(self):
        return f"{self.filename} ({self.user.username})"