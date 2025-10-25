
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.hashers import check_password, make_password
import os, requests, json, random, re
from django.db import connection
from dotenv import load_dotenv
from django.core.mail import send_mail
from django.conf import settings
from django.core.cache import cache

load_dotenv()
# Django 프로젝트 내 .env 파일에 설정되어 있어야 함
RUNPOD_API_URL = os.getenv("RUNPOD_API_LAW")  # Runpod FastAPI endpoint (law/manual 모드 자동 처리)


# def chat(request):
#     # 메인 채팅 화면
#     return render(request, "chat.html") # 합칠 때 이 부분이 이제 우리 본 html 파일이 될 것


@csrf_exempt # CSRF 검증 비활성화 (fetch POST 요청 허용)
def chatbot_api(request):
    # 비동기 채팅 API (JS fetch로 호출됨)
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    try:
        # 프론트엔드로부터 메시지 및 모드 추출
        data = json.loads(request.body)
        message = data.get("message", "")
        mode = data.get("mode", "manual") # 기본값은 매뉴얼 모드가 되도록

        # RunPod API 호출: 모드는 FastAPI 런팟 서버(main.py)에서 자동 분기됨)
        res = requests.post(
            RUNPOD_API_URL,
            json={"text": message, "mode": mode},
            timeout=120,
        )

        # 정상 응답일 경우 RunPod의 결과를 그대로 Django => JS로 반환
        if res.status_code == 200:
            return JsonResponse(res.json())
        else:
            # RunPod 서버에서 에러 응답을 반환한 경우
            return JsonResponse({"error": f"Runpod returned {res.status_code}"}, status=res.status_code)


    # 시간 초과 및 기타 오류 예외처리
    except requests.Timeout:
        return JsonResponse({"error": "Runpod timeout"}, status=504)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

def index(request):

    is_authenticated = request.session.get('is_authenticated', False)
    user_email = request.session.get('user_email', '')
    
    context = {
        'is_authenticated': is_authenticated,
        'user_email': user_email,
    }
    return render(request, 'frontend/index.html', context)


@csrf_exempt
def login(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email', '').strip()
            password = data.get('password', '').strip()
            
        
            if '@' not in email or '.' not in email:
                return JsonResponse({
                    'success': False,
                    'message': '올바른 이메일 형식이 아닙니다.'
                })
         
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT email, password FROM test_rds_users WHERE email = %s",
                    [email]
                )
                user = cursor.fetchone()
            
            if not user:
                return JsonResponse({
                    'success': False,
                    'message': '존재하지 않는 회원입니다.'
                })
            
            if not check_password(password, user[1]):
                return JsonResponse({
                    'success': False,
                    'message': '비밀번호가 일치하지 않습니다.'
                })
            
          
            request.session['is_authenticated'] = True
            request.session['user_email'] = email
            
            return JsonResponse({
                'success': True,
                'message': '로그인 성공',
                'email': email
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': f'오류가 발생했습니다: {str(e)}'
            })
    
    return JsonResponse({'success': False, 'message': '잘못된 요청입니다.'})


# 임시 테스트 로그임 (아무거나 입력하면 되게 함)
# @csrf_exempt
# def login(request):
#     print("[LOGIN] 요청 들어옴:", request.method)
#     if request.method == 'POST':
#         try:
#             data = json.loads(request.body)
#             email = data.get('email', '').strip()
#             password = data.get('password', '').strip()

#             # DB 체크 생략 — 어떤 값이든 로그인 성공 처리
#             if not email:
#                 email = "guest@example.com"

#             request.session['is_authenticated'] = True
#             request.session['user_email'] = email

#             return JsonResponse({
#                 'success': True,
#                 'message': '임시 로그인 성공!',
#                 'email': email
#             })

#         except Exception as e:
#             return JsonResponse({
#                 'success': False,
#                 'message': f'오류 발생: {str(e)}'
#             })

#     return JsonResponse({'success': False, 'message': '잘못된 요청입니다.'})

@csrf_exempt
def logout(request):
    request.session.flush()
    return JsonResponse({'success': True})

# 인증 코드 전송 
@csrf_exempt
def send_code(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST 요청만 허용됩니다."}, status=405)

    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({"error": "잘못된 요청 형식입니다."}, status=400)

    email = data.get("email")
    if not email:
        return JsonResponse({"error": "이메일이 필요합니다."}, status=400)

    # 인증 코드 code에 로직 넣으면 됨
    code = str(random.randint(10000000, 99999999))
    cache.set(email, {"code": code}, timeout=300)

    try:
        send_mail(
            subject="이메일 인증 코드",
            message=f"인증 코드: {code}\n5분 이내에 입력해주세요.",
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[email],
        )
    except Exception as e:
        return JsonResponse({"error": f"메일 발송 실패: {str(e)}"}, status=500)

    return JsonResponse({"message": "인증 코드가 이메일로 전송되었습니다."})

# 인증 번호 인증 
@csrf_exempt
def verify_code(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST 요청만 허용됩니다."}, status=405)

    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({"error": "잘못된 요청 형식입니다."}, status=400)

    email = data.get("email")
    code = data.get("code")

    record = cache.get(email)
    if not record:
        return JsonResponse({"error": "코드가 만료되었거나 존재하지 않습니다."}, status=400)

    if record["code"] != code:
        return JsonResponse({"error": "코드가 일치하지 않습니다."}, status=400)

    cache.delete(email)
    return JsonResponse({"message": "이메일 인증이 완료되었습니다!"})

@csrf_exempt
def check_email(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "POST 요청만 허용됩니다."}, status=405)

    try:
        data = json.loads(request.body)
        email = data.get("email", "").strip()

        if not email:
            return JsonResponse({"success": False, "message": "이메일이 필요합니다."}, status=400)

        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM test_rds_users WHERE email = %s", [email])
            count = cursor.fetchone()[0]

        if count > 0:
            return JsonResponse({"success": False, "message": "이미 등록된 이메일입니다."})
        else:
            return JsonResponse({"success": True, "message": "사용 가능한 이메일입니다."})

    except Exception as e:
        return JsonResponse({"success": False, "message": f"오류 발생: {str(e)}"}, status=500)
    
# 비밀번호 입력 양식 확인 및 비밀번호 일치 확인 
def is_valid_password(password):
    return bool(re.match(r'^(?=.*[a-z])(?=.*\d)[a-z\d]{6,}$', password))

def passwords_match(password, confirm_password):
    return password == confirm_password

@csrf_exempt
def set_password(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "POST 요청만 허용됩니다."}, status=405)
    
    try:
        data = json.loads(request.body)
        password = data.get("password", "").strip()
        confirm_password = data.get("confirm_password", "").strip()
        email = data.get("email", "").strip()

        if not is_valid_password(password):
            return JsonResponse({
                "success": False,
                "message": "비밀번호는 영소문자와 숫자를 포함해 6자 이상이어야 합니다."
            })
        
        if not passwords_match(password, confirm_password):
            return JsonResponse({
                "success": False,
                "message": "비밀번호가 일치하지 않습니다."
            })
        
        hashed_pw = make_password(password)

        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO test_rds_users (email, password, created_at) VALUES (%s, %s, NOW())", 
                [email, hashed_pw]
            )

        return JsonResponse({"success": True, "message": "회원가입이 완료되었습니다."})
    
    except Exception as e:
        return JsonResponse({"success": False, "message": f"오류 발생: {str(e)}"}, status=500)
    

# 기존 비밀번호 검증
@csrf_exempt
def verify_password(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            password = data.get('password', '') 
            user_email = request.session.get('user_email', '')
            
            if not user_email:
                return JsonResponse({'success': False, 'message': '로그인이 필요합니다.'})
     
            with connection.cursor() as cursor:
            
                cursor.execute(
                    "SELECT password FROM test_rds_users WHERE email = %s", 
                    [user_email]
                )
                user = cursor.fetchone()
            
            if user and check_password(password, user[0]): 
                return JsonResponse({'success': True})
            else:
                return JsonResponse({'success': False, 'message': '비밀번호가 일치하지 않습니다.'}) 
                
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})
    
    return JsonResponse({'success': False})

# 비밀번호 변경
@csrf_exempt
def change_password(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            new_password = data.get('new_password', '')
            user_email = request.session.get('user_email', '')
            
            if not user_email:
                return JsonResponse({'success': False, 'message': '로그인이 필요합니다.'})
            
            hashed_password = make_password(new_password)
            
            with connection.cursor() as cursor:
   
                cursor.execute(
                    "UPDATE test_rds_users SET password = %s WHERE email = %s",
                    [hashed_password, user_email] 
                )
            
            return JsonResponse({'success': True, 'message': '비밀번호가 변경되었습니다.'})
                
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})
    
    return JsonResponse({'success': False})

# 회원 탈퇴
@csrf_exempt
def withdraw(request):
    if request.method == 'POST':
        try:
            user_email = request.session.get('user_email', '')
            
            if not user_email:
                return JsonResponse({'success': False, 'message': '로그인이 필요합니다.'})
            
            # DB에서 사용자 삭제
            with connection.cursor() as cursor:
                cursor.execute(
                    "DELETE FROM test_rds_users WHERE email = %s",  # users → test_rds_users
                    [user_email]
                )
            

            request.session.flush()
            
            return JsonResponse({'success': True, 'message': '회원 탈퇴가 완료되었습니다.'})
                
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})
    
    return JsonResponse({'success': False})