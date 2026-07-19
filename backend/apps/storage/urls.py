from django.urls import path
from .views import file_list_api, file_upload_api, file_action_api, file_download_api, file_share_api

urlpatterns = [
    path('', file_list_api),
    path('upload/', file_upload_api),
    path('<int:file_id>/', file_action_api),
    path('<int:file_id>/download/', file_download_api),
    path('share/<str:token>/', file_share_api),
]