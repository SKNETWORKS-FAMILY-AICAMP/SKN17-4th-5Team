
from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    #path('api/login/', views.login, name='login'),
    #path('api/logout/', views.logout, name='logout'),
    path('login/', views.login, name='login'), # 무조건 로그인 되게 테스트 용
    path('logout/', views.logout, name='logout'), # 무조건 로그아웃 되게 테스트
    path('chat/api/', views.chatbot_api, name='chatbot_api'), # 실제 LLM 비동기 API 통신
]