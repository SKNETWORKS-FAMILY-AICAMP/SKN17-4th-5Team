// main.js - 완성된 UI 제어
document.addEventListener('DOMContentLoaded', function(){
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const profileBtn = document.getElementById('profileBtn');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const loginModal = document.getElementById('loginModal');
  const signupModal = document.getElementById('signupModal');
  const profileModal = document.getElementById('profileModal');
  const resetPwdModal = document.getElementById('resetPwdModal');
  const forgotPasswordBtn = document.getElementById('forgotPassword');
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.querySelector('.sidebar');
  const driveToggle = document.getElementById('driveToggle');
  const driveModeLabel = document.querySelector('.drive-mode label');
  const micBtn = document.getElementById('micBtn');
  const sendBtn = document.getElementById('sendBtn');
  const chatInput = document.getElementById('chatInput');

  // 회원가입 관련
  const emailInput = document.getElementById('email');
  const sendCodeBtn = document.getElementById('sendCode');
  const codeInput = document.querySelector('input[name="code"]');
  let emailVerified = false;

  // 햄버거
  if(hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  // 드라이브/리서치 모드 토글
  let isDriveMode = true; // 초기값: 드라이브 모드 (파랑색)

  if(driveToggle && driveModeLabel) {
    // 초기 상태 설정 (드라이브 모드)
    driveToggle.classList.add('on');
    driveModeLabel.textContent = '드라이브 모드';
    if(micBtn) micBtn.style.display = 'block'; // 드라이브 모드: 음성 버튼 활성화

    driveToggle.addEventListener('click', () => {
      
      isDriveMode = !isDriveMode;
      
      if(isDriveMode) {
        // 드라이브 모드로 전환 (파랑)
        driveToggle.classList.add('on');
        driveModeLabel.textContent = '드라이브 모드';
        if(micBtn) micBtn.style.display = 'block'; 
      } else {
        // 리서치 모드로 전환 (빨강)
        driveToggle.classList.remove('on');
        driveModeLabel.textContent = '리서치 모드';
        if(micBtn) micBtn.style.display = 'none'; // 리서치 모드: 음성 버튼 비활성화
      }
      
      console.log(`현재 모드: ${isDriveMode ? '드라이브' : '리서치'}`);
    });
  }

  // 모달 관련 
  function openModal(modal){
    modal.classList.remove('hidden');
    modalBackdrop.classList.remove('hidden');
  }
  
  function closeModal(modal){
    modal.classList.add('hidden');
    modalBackdrop.classList.add('hidden');
  }

  if(loginBtn) loginBtn.addEventListener('click', () => openModal(loginModal));
  if(signupBtn) signupBtn.addEventListener('click', () => openModal(signupModal));
  if(profileBtn) profileBtn.addEventListener('click', () => openModal(profileModal));

  if (forgotPasswordBtn) forgotPasswordBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal(loginModal);
    openModal(resetPwdModal);
  });

  // 모달 닫기 버튼
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.target.getAttribute('data-close') || '';
      if(id) { 
        document.getElementById(id).classList.add('hidden'); 
        modalBackdrop.classList.add('hidden'); 
      } else { 
        e.target.closest('.modal').classList.add('hidden'); 
        modalBackdrop.classList.add('hidden'); 
      }
    });
  });

  // 백드롭 클릭 시 모달 닫기
  modalBackdrop && modalBackdrop.addEventListener('click', () => {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    modalBackdrop.classList.add('hidden');
  });

  // 로그인 처리
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');

  loginForm && loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      loginError.textContent = '올바른 이메일 형식이 아닙니다.';
      loginError.classList.remove('hidden');
      return;
    }

    try {
      const response = await fetch('/api/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (data.success) {
        window.location.reload();
      } else {
        loginError.textContent = data.message;
        loginError.classList.remove('hidden');
      }
    } catch (error) {
      loginError.textContent = '서버 오류가 발생했습니다.';
      loginError.classList.remove('hidden');
    }
  });

  // 로그아웃 처리
  const logoutBtn = document.getElementById('logoutBtn');
  logoutBtn && logoutBtn.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/logout/', { method: 'POST' });
      const data = await response.json();
      if (data.success) window.location.reload();
    } catch (error) {
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  });

  // 회원가입 버튼 흐름: 중복확인 → 인증번호 발송
  sendCodeBtn && sendCodeBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    emailMessage.textContent = ''; // 초기화

    if (!email) {
      emailMessage.textContent = '이메일을 입력해주세요.';
										 
      return;
    }

    if (!emailVerified) {
      try {
        const response = await fetch('/api/check-email/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await response.json();

        if (data.success) {
          emailMessage.textContent = '사용 가능한 이메일입니다.';
          emailVerified = true;
          sendCodeBtn.textContent = '인증번호 발송';
        } else {
          emailMessage.textContent = data.message || '이미 등록된 이메일입니다.';
        }
      } catch (error) {
        alert('중복확인 중 오류가 발생했습니다.');
      }
    } else {
      try {
        const response = await fetch('/api/send-code/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await response.json();

        if (data.success) {
          alert('인증번호가 이메일로 전송되었습니다.');
          codeInput.disabled = false;
        } else {
          alert(data.message || '인증번호 발송 실패');
        }
      } catch (error) {
        alert('인증번호 발송 중 오류가 발생했습니다.');
      }
    }
  });

  const verifyBtn = document.getElementById('verifyCodeBtn'); // 버튼 추가 필요
  verifyBtn && verifyBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const code = codeInput.value.trim();

  try {
    const response = await fetch('/api/verify-code/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    const data = await response.json();

    if (data.message) {
      alert(data.message);
      verifyBtn.disabled = true;
    } else {
      alert(data.error || '인증 실패');
    }
  } catch (error) {
    alert('인증 요청 중 오류 발생');
  }
});

  // 전송 버튼 (llm이랑 FAST API로 통신)
 sendBtn && sendBtn.addEventListener('click', async () => {
  const message = chatInput.value.trim();
  if (!message) return;

  // (1) 사용자가 입력한 메시지 화면에 추가
  const messagesDiv = document.querySelector('.messages');
  const userMsg = document.createElement('div');
  userMsg.className = 'message user';
  userMsg.textContent = message;
  messagesDiv.appendChild(userMsg);
  chatInput.value = '';

  // (2) 로딩 메시지 표시
  const loadingMsg = document.createElement('div');
  loadingMsg.className = 'message bot';
  loadingMsg.textContent = '답변 생성 중...';
  messagesDiv.appendChild(loadingMsg);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  // (3) 현재 모드 가져오기 
  const mode = isDriveMode ? 'manual' : 'law';

  try {
    // (4) Django → RunPod FastAPI 호출
    const response = await fetch('/chat/api/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, mode })
    });

    const data = await response.json();
    loadingMsg.remove();

    // (5) 응답 표시
    const botMsg = document.createElement('div');
    botMsg.className = 'message bot';
    botMsg.textContent = data.answer || data.error || '응답을 불러올 수 없습니다.';
    messagesDiv.appendChild(botMsg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  } catch (error) {
    loadingMsg.textContent = '서버 연결 실패';
  }
});


  // Enter 키로 전송
  chatInput && chatInput.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') {
      sendBtn.click();
    }
  });

  // 새 채팅 버튼 
  const newChatBtn = document.querySelector('.new-chat');
  newChatBtn && newChatBtn.addEventListener('click', () => {
    alert('새 채팅 시작: 추후 구현 예정');
  });

  // 채팅 아이템 클릭 
  document.querySelectorAll('.chat-item').forEach(item => {
    item.addEventListener('click', () => {
      alert('채팅 불러오기: 추후 구현 예정');
    });
  });
});

  // 음성 입력 버튼
  micBtn && micBtn.addEventListener('click', () => {
    alert('음성 입력 기능: 추후 구현 예정');
  });