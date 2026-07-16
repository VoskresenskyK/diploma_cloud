from django.contrib.auth import authenticate, login
from django.contrib.auth import get_user_model
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

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

        # Разделяем полное имя на Имя и Фамилию для Django модели
        name_parts = fullname.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        # Создаем пользователя в базе данных
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        return JsonResponse({"status": "success", "message": "Пользователь успешно создан"}, status=201)

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
                    "username": user.username,
                    "email": user.email,
                    "fullname": f"{user.first_name} {user.last_name}".strip()
                }
            }, status=200)
        else:
            return JsonResponse({"error": "Неверный логин или пароль"}, status=400)

    except Exception as e:
        return JsonResponse({"error": f"Ошибка на сервере: {str(e)}"}, status=500)
