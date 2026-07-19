from django.db import models
from django.contrib.auth import get_user_model
import secrets

User = get_user_model()


class UserFile(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='files', verbose_name="Владелец")
    file = models.FileField(upload_to='uploads/', verbose_name="Файл")
    filename = models.CharField(max_length=255, verbose_name="Имя файла")
    comment = models.TextField(blank=True, null=True, verbose_name="Комментарий")
    size = models.BigIntegerField(verbose_name="Размер в байтах")
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата загрузки")
    last_downloaded_at = models.DateTimeField(blank=True, null=True, verbose_name="Дата последнего скачивания")
    share_token = models.CharField(max_length=100, unique=True, blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.share_token:
            self.share_token = secrets.token_urlsafe(16)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.filename} ({self.user.username})"
