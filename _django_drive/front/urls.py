from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/login/', views.login, name='login'),
    path('api/logout/', views.logout, name='logout'),
    # path('login/', views.login, name='login'), # 무조건 로그인 되게 테스트 용
    # path('logout/', views.logout, name='logout'), # 무조건 로그아웃 되게 테스트
    path('chat/api/', views.chatbot_api, name='chatbot_api'), # 실제 LLM 비동기 API 통신

    # 인증코드 보내기 및 검증
    path("api/send-code/", views.send_code, name="send_code"),
    path("api/verify-code/", views.verify_code, name="verify_code"),
    path("api/check-email/", views.check_email, name="check_email"),
    path("api/set_password/", views.set_password, name="set_password"),

    # 비번 검증, 변경, 회원 탈퇴
    path('api/verify-password/', views.verify_password, name='verify_password'),
    path('api/change-password/', views.change_password, name='change_password'),
    path('api/withdraw/', views.withdraw, name='withdraw'),

    # 채팅방
    path("create_conversation/", views.create_conversation, name="create_conversation"),
    path('chat/load_conversation/', views.load_conversation, name='load_conversation'),

    # TTS
    path("tts/", views.tts_view, name="tts"),
    #path("tts/stream/", views.tts_stream_view, name="tts_stream"),  # 스트리밍 버전
]