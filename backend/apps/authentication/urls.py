from django.urls import path
from .views import api_register, api_login, users_list_api, toggle_admin_api, delete_user_api

urlpatterns = [
    path('register/', api_register, name='api_register'),
    path('login/', api_login, name='api_login'),
    path('users/', users_list_api),
    path('users/<int:user_id>/toggle-admin/', toggle_admin_api),
    path('users/<int:user_id>/delete/', delete_user_api),
]