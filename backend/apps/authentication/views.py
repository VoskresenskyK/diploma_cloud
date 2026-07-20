from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
import json
import os

User = get_user_model()

@csrf_exempt
def api_register(request):
    if request.method != "POST":
        return JsonResponse({"error": "Метод не поддерживается"}, status=405)

    try:
        data = json.loads(request.body)
        username = data.get("username")
        fullname = data.get("name")
        email = data.get("email")
        password = data.get("password")

        # Дополнительная проверка на бэкенде: занят ли логин
        if User.objects.filter(username=username).exists():
            return JsonResponse({"error": "Пользователь с таким логином уже существует"}, status=400)

        if User.objects.filter(email=email).exists():
            return JsonResponse({"error": "Пользователь с таким email уже существует"}, status=400)

        # # Разделяем полное имя на Имя и Фамилию для Django модели
        # name_parts = fullname.split(" ", 1)
        # first_name = name_parts[0]
        # last_name = name_parts[1] if len(name_parts) > 1 else ""

        # Создаем пользователя в базе данных
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            full_name=fullname,
            is_admin=False
        )

        # ДОБАВЛЯЕМ АВТОРИЗАЦИЮ СРАЗУ ПОСЛЕ СОЗДАНИЯ
        from django.contrib.auth import login
        login(request, user) # Логиним в сессию Django

        return JsonResponse({
            "status": "success",
            "message": "Пользователь успешно создан",
            "storage_path": user.storage_path,  # Возвращаем сгенерированный путь для фронтенда
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "fullname": user.full_name,
                "is_admin": user.is_admin
            }
        }, status=201)

    except Exception as e:
        return JsonResponse({"error": f"Ошибка на сервере: {str(e)}"}, status=500)


@csrf_exempt
def api_login(request):
    if request.method != "POST":
        return JsonResponse({"error": "Метод не поддерживается"}, status=405)

    try:
        data = json.loads(request.body)
        username = data.get("username")
        password = data.get("password")

        # Проверяем логин и пароль встроенной функцией Django
        user = authenticate(request, username=username, password=password)

        if user is not None:
            # Если всё верно, логиним пользователя в сессию Django
            login(request, user)
            return JsonResponse({
                "status": "success",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "fullname":  user.full_name,
                    "is_admin": user.is_admin
                }
            }, status=200)
        else:
            return JsonResponse({"error": "Неверный логин или пароль"}, status=400)

    except Exception as e:
        return JsonResponse({"error": f"Ошибка на сервере: {str(e)}"}, status=500)


@csrf_exempt
def users_list_api(request):
    """Получение списка всех пользователей системы (только для админа)"""
    if request.method != "GET":
        return JsonResponse({"error": "Метод не поддерживается"}, status=405)

    current_user_id = request.headers.get('X-User-Id')
    current_user = get_object_or_404(User, id=current_user_id)

    if not current_user.is_admin:
        return JsonResponse({"error": "Доступ запрещен"}, status=403)

    # Аннотируем каждого пользователя количеством его файлов и суммой их размеров.
    # related_name='files' в модели UserFile позволяет обращаться к ним через 'files'
    users = User.objects.annotate(
        files_count=Count('files'),
        total_size=Sum('files__size')
    ).order_by('id')

    data = []
    for u in users:
        # Если у пользователя нет файлов, Sum('files__size') вернет None. Заменяем его на 0.
        size_in_bytes = u.total_size if u.total_size is not None else 0

        # Переводим размер в читаемый вид (КБ)
        size_in_kb = round(size_in_bytes / 1024, 1)

        data.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "fullname": u.full_name,
            "is_admin": u.is_admin,
            "files_count": u.files_count,  # Количество файлов
            "total_size_kb": size_in_kb  # Общий размер в КБ
        })

    return JsonResponse({"users": data})


@csrf_exempt
def toggle_admin_api(request, user_id):
    """Назначение / снятие прав администратора (только для админа)"""
    if request.method != "POST":
        return JsonResponse({"error": "Метод не поддерживается"}, status=405)

    current_user_id = request.headers.get('X-User-Id')
    current_user = get_object_or_404(User, id=current_user_id)

    if not current_user.is_admin:
        return JsonResponse({"error": "Доступ запрещен"}, status=403)

    target_user = get_object_or_404(User, id=user_id)

    # Не разрешаем админу снимать права с самого себя, чтобы не остаться без админов
    if target_user.id == current_user.id:
        return JsonResponse({"error": "Вы не можете снять права суперпользователя с себя"}, status=400)

    data = json.loads(request.body)
    make_admin = data.get("is_admin", False)

    target_user.is_admin = make_admin
    target_user.is_superuser = make_admin  # Синхронизируем со встроенной системой Django
    target_user.is_staff = make_admin
    target_user.save()

    return JsonResponse({"status": "success", "message": "Роль успешно изменена"})


@csrf_exempt
def delete_user_api(request, user_id):
    """Удаление пользователя (сам себя или админом другого)"""
    if request.method != "DELETE":
        return JsonResponse({"error": "Метод не поддерживается"}, status=405)

    current_user_id = request.headers.get('X-User-Id')
    current_user = get_object_or_404(User, id=current_user_id)

    target_user = get_object_or_404(User, id=user_id)

    # Проверка прав: либо ты админ, либо ты удаляешь сам себя
    if current_user.id != target_user.id and not current_user.is_admin:
        return JsonResponse({"error": "Нет прав на удаление этого пользователя"}, status=403)

    # Удаляем физические файлы пользователя перед его удалением, чтобы диск не засорялся
    from apps.storage.models import UserFile
    user_files = UserFile.objects.filter(user=target_user)
    for f in user_files:
        if f.file and os.path.exists(f.file.path):
            os.remove(f.file.path)

    # Удаляем пользователя (связанные записи в базе удалятся автоматически благодаря CASCADE)
    target_user.delete()

    return JsonResponse({"status": "success", "message": "Пользователь успешно удален"})