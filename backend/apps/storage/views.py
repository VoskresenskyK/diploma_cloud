from django.http import JsonResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.utils.encoding import escape_uri_path
from django.contrib.auth import get_user_model
from .models import UserFile
import json
import os
import logging

# Инициализируем логгер, настроенный в settings.py
logger = logging.getLogger('storage_app')
User = get_user_model()


def check_session_and_permissions(request, target_user_id=None):
    # Читаем ID пользователя из заголовков, которые шлет React
    current_user_id = request.headers.get('X-User-Id') or request.GET.get('auth_user_id')

    if not current_user_id:
        logger.warning(f"WARNING [{timezone.now()}] Попытка несанкционированного доступа к API. Отсутствует X-User-Id.")
        return None, JsonResponse({"error": "Пользователь не авторизован."}, status=401)

    try:
        # Ищем пользователя в базе данных
        current_user = User.objects.get(id=current_user_id)
    except User.DoesNotExist:
        logger.warning(f"WARNING [{timezone.now()}] Пользователь с ID {current_user_id} не найден в БД.")
        return None, JsonResponse({"error": "Пользователь не найден."}, status=401)

    # Проверка прав администратора / пользователя
    if current_user.is_admin:
        if target_user_id:
            target_user = get_object_or_404(User, id=target_user_id)
            return target_user, None
        return current_user, None
    else:
        # Обычный пользователь может управлять только своим хранилищем
        if target_user_id and int(target_user_id) != current_user.id:
            logger.error(
                f"ERROR [{timezone.now()}] Пользователь {current_user.username} пытался получить доступ к чужому хранилищу ID {target_user_id}.")
            return None, JsonResponse({"error": "Доступ запрещен. У вас нет прав администратора."}, status=403)
        return current_user, None


@csrf_exempt
def file_list_api(request):
    """1. ПОЛУЧЕНИЕ СПИСКА ФАЙЛОВ (принимает параметр user_id, если запросил админ)"""
    if request.method != "GET":
        return JsonResponse({"error": "Метод не поддерживается"}, status=405)

    target_user_id = request.GET.get('user_id')
    user, error_response = check_session_and_permissions(request, target_user_id)
    if error_response:
        return error_response

    logger.info(
        f"INFO [{timezone.now()}] Пользователь {request.user.username} запросил список файлов хранилища {user.username}.")

    files = UserFile.objects.filter(user=user).order_by('-uploaded_at')
    current_host = request.get_host()
    data = []
    for f in files:
        last_download = f.last_downloaded_at.strftime("%Y-%m-%dT%H:%M:%S") if f.last_downloaded_at else None

        data.append({
            "id": f.id,
            "filename": f.filename,
            "comment": f.comment or "",
            "size": f.size,
            "uploaded_at": f.uploaded_at.strftime("%Y-%m-%dT%H:%M:%S"),
            "last_downloaded_at": last_download,  # <-- Передаем обработанную переменную
            "path_in_storage": f.path_in_storage,
            "share_url": f"http://{current_host}/api/files/share/{f.share_token}/"
        })

    return JsonResponse({"files": data}, status=200)


@csrf_exempt
def file_upload_api(request):
    """2. ЗАГРУЗКА ФАЙЛА В ХРАНИЛИЩЕ (с указанием комментария)"""
    if request.method != "POST":
        return JsonResponse({"error": "Метод не поддерживается"}, status=405)

    target_user_id = request.POST.get('user_id')
    user, error_response = check_session_and_permissions(request, target_user_id)
    if error_response: return error_response

    uploaded_file = request.FILES.get('file')
    comment = request.POST.get('comment', '')

    if not uploaded_file:
        logger.warning(
            f"WARNING [{timezone.now()}] Пользователь {request.user.username} отправил пустой запрос загрузки.")
        return JsonResponse({"error": "Файл не выбран"}, status=400)

    try:
        user_file = UserFile.objects.create(
            user=user,
            file=uploaded_file,
            filename=uploaded_file.name,
            comment=comment,
            size=uploaded_file.size
        )
        logger.info(
            f"INFO [{timezone.now()}] Файл '{user_file.filename}' ({user_file.size} Б) успешно загружен в хранилище {user.username} пользователем {request.user.username}.")
        return JsonResponse({"status": "success", "message": "Файл успешно загружен"}, status=201)
    except Exception as e:
        logger.error(f"ERROR [{timezone.now()}] Ошибка при сохранении файла на сервере: {str(e)}")
        return JsonResponse({"error": "Внутренняя ошибка сервера при сохранении"}, status=500)


@csrf_exempt
def file_action_api(request, file_id):
    """3. УДАЛЕНИЕ ФАЙЛА, 4. ПЕРЕИМЕНОВАНИЕ ФАЙЛА, 5. ИЗМЕНЕНИЕ КОММЕНТАРИЯ"""
    db_file = get_object_or_404(UserFile, id=file_id)
    user, error_response = check_session_and_permissions(request, db_file.user.id)
    if error_response: return error_response

    if request.method == "DELETE":
        filename_log = db_file.filename
        if db_file.file and os.path.exists(db_file.file.path):
            os.remove(db_file.file.path)
        db_file.delete()

        logger.info(
            f"INFO [{timezone.now()}] Пользователь {request.user.username} удалил файл '{filename_log}' из хранилища {user.username}.")
        return JsonResponse({"status": "success", "message": "Файл удален"}, status=200)

    elif request.method == "POST":
        data = json.loads(request.body)

        if "new_name" in data:
            new_name = data.get("new_name")
            if not new_name: return JsonResponse({"error": "Имя не может быть пустым"}, status=400)
            old_name = db_file.filename
            db_file.filename = new_name
            db_file.save()
            logger.info(
                f"INFO [{timezone.now()}] Пользователь {request.user.username} переименовал файл '{old_name}' в '{new_name}'.")
            return JsonResponse({"status": "success", "message": "Файл переименован"}, status=200)

        return JsonResponse({"error": "Неизвестное действие"}, status=400)


@csrf_exempt
def file_download_api(request, file_id):
    """6. СКАЧИВАНИЕ/ПРОСМОТР ФАЙЛА АВТОРИЗОВАННЫМ ПОЛЬЗОВАТЕЛЕМ"""
    db_file = get_object_or_404(UserFile, id=file_id)

    user, error_response = check_session_and_permissions(request, db_file.user.id)
    if error_response:
        return error_response

    db_file.last_downloaded_at = timezone.now()
    db_file.save()

    logger.info(f"INFO [{timezone.now()}] Пользователь {user.username} запросил файл '{db_file.filename}' из ЛК.")

    if not db_file.file or not os.path.exists(db_file.file.path):
        logger.error(
            f"ERROR [{timezone.now()}] Физический файл не найден на диске: {db_file.file.path if db_file.file else 'Пусто'}")
        return JsonResponse({"error": "Физический файл отсутствует на сервере хранилища."}, status=404)


    force_download = request.GET.get('download') == '1'

    response = FileResponse(db_file.file, as_attachment=force_download)
    encoded_filename = escape_uri_path(db_file.filename)

    if force_download:
        response[
            'Content-Disposition'] = f'attachment; filename="{encoded_filename}"; filename*=UTF-8\'\'{encoded_filename}'
    else:
        response[
            'Content-Disposition'] = f'inline; filename="{encoded_filename}"; filename*=UTF-8\'\'{encoded_filename}'

    return response


def file_share_api(request, token):
    """
    7. ФОРМИРОВАНИЕ ССЫЛКИ (ссылка создается автоматически при загрузке)
    8. СКАЧИВАНИЕ ФАЙЛА ЧЕРЕЗ СПЕЦИАЛЬНУЮ ССЫЛКУ ВНЕШНИМИ ПОЛЬЗОВАТЕЛЯМИ
    """
    # Публичный эндпоинт, доступен без сессии для внешних пользователей
    db_file = get_object_or_404(UserFile, share_token=token)

    db_file.last_downloaded_at = timezone.now()
    db_file.save()

    logger.info(
        f"INFO [{timezone.now()}] Внешний пользователь скачал файл '{db_file.filename}' по специальной ссылке токена {token[:6]}...")

    force_download = request.GET.get('download') == '1'
    response = FileResponse(db_file.file, as_attachment=force_download)
    encoded_filename = escape_uri_path(db_file.filename)

    if force_download:
        response[
            'Content-Disposition'] = f'attachment; filename="{encoded_filename}"; filename*=UTF-8\'\'{encoded_filename}'
    else:
        response[
            'Content-Disposition'] = f'inline; filename="{encoded_filename}"; filename*=UTF-8\'\'{encoded_filename}'

    return response