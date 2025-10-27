
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.hashers import check_password, make_password
import os, requests, json, random, re, string
from django.db import connection
from dotenv import load_dotenv
from django.core.mail import send_mail
from django.conf import settings
from django.core.cache import cache
from .models import User, Conversation, Message
from django.views.decorators.http import require_GET
from dotenv import load_dotenv

load_dotenv()
# Django 프로젝트 내 .env 파일에 설정되어 있어야 함
RUNPOD_API_URL = os.getenv("RUNPOD_API_LAW")  # Runpod FastAPI endpoint (law/manual 모드 자동 처리)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


import os, json, requests, traceback
from django.http import HttpResponse, JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from dotenv import load_dotenv

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

@csrf_exempt
def tts_view(request):
    try:
        # 1. POST 방식으로 text 받기
        if request.method == "POST":
            try:
                data = json.loads(request.body.decode("utf-8"))
                text = data.get("text", "").strip()
            except json.JSONDecodeError:
                return JsonResponse({"error": "Invalid JSON in request body"}, status=400)
        else:
            text = request.GET.get("text", "").strip()

        if not text:
            return JsonResponse({"error": "No text provided"}, status=400)

        # 2. 디버그용 로그
        print(f"[DEBUG] 🔑 OPENAI_API_KEY 존재 여부: {bool(OPENAI_API_KEY)}")
        print(f"[DEBUG] 📜 입력 텍스트 길이: {len(text)}자")

        # 3. 요청 헤더 및 페이로드
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "gpt-4o-mini-tts",
            "voice": "verse",
            "input": text
        }

        # 4. OpenAI API 호출
        r = requests.post(
            "https://api.openai.com/v1/audio/speech",
            headers=headers,
            json=payload,
            timeout=60  # 안전한 타임아웃
        )

        print(f"[DEBUG] 🎧 OpenAI 응답 상태코드: {r.status_code}")

        # 5. 성공 시 mp3 반환
        if r.status_code == 200:
            response = HttpResponse(r.content, content_type="audio/mpeg")
            response["Content-Disposition"] = "inline; filename=speech.mp3"
            return response

        # 6. 실패 시 상세 로그 출력
        print("[DEBUG] ❌ OpenAI 응답 본문:", r.text)
        return JsonResponse(
            {"error": "OpenAI API 요청 실패", "status": r.status_code, "body": r.text},
            status=r.status_code,
        )

    except Exception as e:
        print("[TTS ERROR]", traceback.format_exc())
        return JsonResponse({"error": str(e)}, status=500)



@csrf_exempt
def create_conversation(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    try:
        user_email = request.session.get('user_email')
        if not user_email:
            return JsonResponse({"error": "로그인이 필요합니다."}, status=401)

        user = User.objects.get(email=user_email)
        mode = request.POST.get("mode", "drive")

        
        conversation = Conversation.objects.create(
            user=user,
            title="새 대화",
            mode=mode
        )

        return JsonResponse({
            "success": True,
            "conversation_id": conversation.conversation_id
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    


# 이전 대화 내역 삭제
@csrf_exempt
def delete_conversation(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Invalid method"}, status=405)

    try:
        data = json.loads(request.body)
        convo_id = data.get("conversation_id")
        if not convo_id:
            return JsonResponse({"success": False, "error": "Missing conversation_id"}, status=400)

        deleted, _ = Conversation.objects.filter(conversation_id=convo_id).delete()
        if deleted:
            print(f"[DELETE] Conversation {convo_id} 삭제 완료 ✅")
            return JsonResponse({"success": True})
        else:
            return JsonResponse({"success": False, "error": "Conversation not found"}, status=404)

    except Exception as e:
        print("[DELETE ERROR]", traceback.format_exc())
        return JsonResponse({"success": False, "error": str(e)}, status=500)






@csrf_exempt # CSRF 검증 비활성화 (fetch POST 요청 허용)
def chatbot_api(request):
    # 비동기 채팅 API (JS fetch로 호출됨)
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    try:
        print("[DEBUG] request.body:", request.body)
        # 프론트엔드로부터 메시지 및 모드 추출
        data = json.loads(request.body)
        print("[DEBUG] 받은 데이터:", data)  # 확인용
        conversation_id = data.get("conversation_id") # 채팅방 id
        message = data.get("message", "")
        mode = data.get("mode", "manual") # 기본값은 매뉴얼 모드가 되도록


        if not message:
            return JsonResponse({"error": "Message required"}, status=400)
        if not conversation_id:
            return JsonResponse({"error": "conversation_id required"}, status=400)


        # Conversation 존재 확인
        try:
            conversation = Conversation.objects.get(conversation_id=conversation_id)
        except Conversation.DoesNotExist:
            return JsonResponse({"error": "Conversation not found"}, status=404)

        # 사용자 메시지 저장
        user_message = Message.objects.create(
            conversation=conversation,
            role="user",
            content=message
        )

        # 첫 메시지 여부 판별 (지금 저장한 메시지 포함해서)
        message_count = Message.objects.filter(conversation=conversation).count()
        is_first_message = message_count == 1

        # 첫 메시지일 때만 제목 자동 설정
        if is_first_message:
            short_title = message[:10] + ("..." if len(message) > 10 else "")
            conversation.title = short_title
            conversation.save()


        # RunPod API 호출: 모드는 FastAPI 런팟 서버(main.py)에서 자동 분기됨)
        print("[DEBUG] RUNPOD_API_URL:", RUNPOD_API_URL)

        res = requests.post(
            RUNPOD_API_URL,
            json={"text": message, "mode": mode},
            timeout=120,
        )

        # 정상 응답일 경우 RunPod의 결과를 그대로 Django => JS로 반환
        if res.status_code != 200:
            return JsonResponse({"error": f"Runpod returned {res.status_code}"}, status=res.status_code)


        res_json = res.json()
        answer = res_json.get("answer", "(응답 없음)")

        # AI 응답 저장
        Message.objects.create(
            conversation=conversation,
            role="assistant",
            content=answer
        )

        # # 첫 질문이라면 title 자동 생성
        # if conversation.title == "새 대화":
        #     short_title = message[:10] + ("..." if len(message) > 10 else "")
        #     conversation.title = short_title
        #     conversation.save()

        # 프론트로 응답 반환
        return JsonResponse({
            "success": True,
            "answer": answer,
            "is_first_message": is_first_message
        })

    # 시간 초과 및 기타 오류 예외처리
    except requests.Timeout:
        return JsonResponse({"error": "Runpod timeout"}, status=504)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)






def index(request):

    is_authenticated = request.session.get('is_authenticated', False)
    user_email = request.session.get('user_email', '')
    conversations = []
    current_convo_id = None
    
    # 회원이 전혀 없는 경우 (User 테이블 비었을 때)
    if not User.objects.exists():
        print("[INFO] No users in DB yet → 기본 화면 렌더링")
        return render(request, 'frontend/index.html', {
            'is_authenticated': False,
            'user_email': '',
            'conversations': [],
            'current_convo_id': None,
        })

    # 로그인 되어 있을 경우만 대화 로드 시도
    if is_authenticated and user_email:
        user = User.objects.filter(email=user_email).first()
        if user:
            conversations = Conversation.objects.filter(user=user).order_by('-created_at')
            if conversations.exists():
                current_convo_id = conversations.first().conversation_id
        else:
            # 세션에는 이메일이 있는데 실제 DB에 유저가 없는 경우
            print(f"[WARN] user_email={user_email} not found → 세션 초기화")
            request.session.flush()
            is_authenticated = False

    context = {
        'is_authenticated': is_authenticated,
        'user_email': user_email,
        'conversations': conversations,
        'current_convo_id': current_convo_id,
    }
    return render(request, 'frontend/index.html', context)


@csrf_exempt
def login(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email', '').strip()
            password = data.get('password', '').strip()
            mode = request.POST.get("mode", "drive")
        
            if '@' not in email or '.' not in email:
                return JsonResponse({
                    'success': False,
                    'message': '올바른 이메일 형식이 아닙니다.'
                })
         
            # 사용자 조회
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
            
            # 세션 등록
            request.session['is_authenticated'] = True
            request.session['user_email'] = email
            

            # 로그인 시 자동으로 새 대화방 생성
            user_obj = User.objects.get(email=email)
            conversation = Conversation.objects.create(
                user=user_obj,
                title="새 대화",
                mode=mode
            )

            return JsonResponse({
                'success': True,
                'message': '로그인 성공',
                'email': email,
                'conversation_id': conversation.conversation_id
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
    # code = str(random.randint(10000000, 99999999))
    def generate_random_code(length):
        chars = string.ascii_letters + string.digits  # 알파벳 대소문자 + 숫자
        return ''.join(random.choice(chars) for _ in range(length))
    code = generate_random_code(8)
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

    return JsonResponse({"message": "인증번호가 이메일로 전송되었습니다.", "success": True})

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
            return JsonResponse({"success": False})
        else:
            return JsonResponse({"success": True})

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
            user_email = request.session.get('user_email', data.get('user_email', ''))
            
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




@require_GET
def load_conversation(request):
    """
    저장된 특정 conversation_id의 모든 메시지를 반환
    (새로고침 후 복원용)
    """
    convo_id = request.GET.get("conversation_id")
    if not convo_id:
        return JsonResponse({"success": False, "error": "conversation_id missing"}, status=400)

    try:
        conversation = Conversation.objects.get(conversation_id=convo_id)
        messages = Message.objects.filter(conversation=conversation).order_by("created_at")

        return JsonResponse({
            "success": True,
            "messages": [
                {"role": msg.role, "content": msg.content}
                for msg in messages
            ]
        })

    except Conversation.DoesNotExist:
        return JsonResponse({"success": False, "error": "Conversation not found"}, status=404)
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)
