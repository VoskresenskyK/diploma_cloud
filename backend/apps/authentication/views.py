from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
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

        if User.objects.filter(username=username).exists():
            return JsonResponse({"error": "Пользователь с таким логином уже существует"}, status=400)

        if User.objects.filter(email=email).exists():
            return JsonResponse({"error": "Пользователь с таким email уже существует"}, status=400)

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            full_name=fullname,
            is_admin=False
        )

        # ДОБАВЛЯЕМ АВТОРИЗАЦИЮ СРАЗУ ПОСЛЕ СОЗДАНИЯ
        from django.contrib.auth import login
        login(request, user)

        return JsonResponse({
            "status": "success",
            "message": "Пользователь успешно создан",
            "storage_path": user.storage_path,
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

        user = authenticate(request, username=username, password=password)

        if user is not None:
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
