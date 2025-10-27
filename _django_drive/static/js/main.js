import { playTTS_OpenAI } from './tts.js'; 


// DOM (main.js - 완성된 UI 제어)
document.addEventListener('DOMContentLoaded', function(){
  console.log('JavaScript loaded'); 

  // 새로고침 시 읽기모드 복원
  const isReadonly = localStorage.getItem('is_readonly');
  if (isReadonly === 'true') {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    if (chatInput && sendBtn) {
      chatInput.disabled = true;
      sendBtn.disabled = true;

      // 안내 배너가 없다면 추가
      let banner = document.querySelector('.readonly-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.className = 'readonly-banner';
        banner.textContent = '이전 대화 보기 (읽기 전용)';
        banner.style.cssText = `
          background: #f3f4f6;
          color: #555;
          text-align: center;
          padding: 8px;
          font-size: 13px;
          border-bottom: 1px solid #ddd;
        `;
        const messagesDiv = document.querySelector('.messages');
        if (messagesDiv && messagesDiv.parentNode) {
          messagesDiv.parentNode.prepend(banner);
        }
      }
    }
  }
  // 로그인 상태에서 새로고침 시 읽기모드 초기화
  const userEmailEl = document.querySelector('.profile-circle');
  if (userEmailEl) {
    // 로그인 상태로 감지됨 → 읽기 모드 초기화
    localStorage.removeItem('is_readonly');
  }


  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const profileBtn = document.getElementById('profileBtn');
  const changePwdBtn = document.getElementById('changePwdBtn');
  const changePwdModal = document.getElementById('changePwdModal');
  const withdrawBtn = document.getElementById('withdrawBtn');

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
  const sendCodeBtn = document.getElementById('sendCode');
  const codeInput = document.querySelector('input[name="code"]');
  let emailVerified = false;

  // 비밀번호 재설정
  const resetPwd_sendCodeBtn = document.getElementById('resetPwd_sendCode');

  // 탈퇴 관련 변수
  const withdrawModal = document.getElementById('withdrawModal');
  const withdrawConfirmModal = document.getElementById('withdrawConfirmModal');
  const withdrawSuccessModal = document.getElementById('withdrawSuccessModal');
  const withdrawForm = document.getElementById('withdrawForm');
  const withdrawPassword = document.getElementById('withdrawPassword');
  const withdrawError = document.getElementById('withdrawError');

  // 새로고침 시 마지막 대화 복원
  const savedConvoId = localStorage.getItem('conversation_id');


  if (savedConvoId) {
    console.log('[INIT] 기존 conversation_id:', savedConvoId);

  fetch(`/chat/load_conversation/?conversation_id=${savedConvoId}`)
    .then(res => res.json())
    .then(data => {
      if (data.success && data.messages.length > 0) {
        const messagesDiv = document.querySelector('.messages');
        messagesDiv.innerHTML = ''; // "채팅을 시작해주세요" 제거

        data.messages.forEach(msg => {
          const msgDiv = document.createElement('div');
          msgDiv.className = `message ${msg.role === 'user' ? 'user' : 'bot'}`;
          msgDiv.textContent = msg.content;
          messagesDiv.appendChild(msgDiv);
        });

        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        console.log(`[INIT] ${data.messages.length}개 메시지 복원됨`);
      } else {
        console.log('[INIT] 복원할 메시지 없음.');
      }
    })
    .catch(err => console.error('[INIT] 대화 복원 오류:', err));
  }

  const timers = {};

  // 타이머 시작 함수
  
  function startTimer(timerElementId) {
    const timerDisplay = document.getElementById(timerElementId);
    console.log(timerElementId)
    if (!timerDisplay) {
      return;
    }
    
    // 기존 타이머가 있으면 정리
    if (timers[timerElementId]) {
      clearInterval(timers[timerElementId]);
    }
    
    let timeLeft = 10; // 5분
    
    timerDisplay.classList.remove("hidden");
    timerDisplay.style.color = "#000";
    timerDisplay.textContent = formatTime(timeLeft);

    timers[timerElementId] = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        timerDisplay.textContent = formatTime(timeLeft);
      } else {
        clearInterval(timers[timerElementId]);
        timerDisplay.textContent = "인증 시간이 만료되었습니다.";
        timerDisplay.style.color = "red";
      }
    }, 1000);
  }
  // 타이머 정지 함수
  function stopTimer(timerElementId) {
    const timerDisplay = document.getElementById(timerElementId);
    if (timers[timerElementId]) {
      clearInterval(timers[timerElementId]);
      if (timerDisplay) {
        timerDisplay.textContent = "0:00";
      }
    }
  }

  // 시간 포맷 함수 (MM:SS)
  function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? "0" + sec : sec}`;
  }
 
  console.log('changePwdBtn:', changePwdBtn); 
  console.log('withdrawBtn:', withdrawBtn);

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

  // 비밀번호 찾기(재설정)
  if (forgotPasswordBtn) forgotPasswordBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal(loginModal);
    openModal(resetPwdModal);
  });

  // 비밀번호 변경 버튼
  if(changePwdBtn) {
    changePwdBtn.addEventListener('click', () => {
      closeModal(profileModal);
      openModal(changePwdModal);
    });
  }
  
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
      document.querySelectorAll('.reset-on-close').forEach(f => f.reset());
    });
  });

  // 백드롭 클릭 시 모달 닫기
  modalBackdrop && modalBackdrop.addEventListener('click', () => {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    modalBackdrop.classList.add('hidden');
    document.querySelectorAll('.reset-on-close').forEach(f => f.reset());
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
      // 로그인 요청
      const response = await fetch('/api/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (data.success) {
      // 로그인 성공 → 기존 conversation_id 삭제
      localStorage.removeItem('conversation_id');
      localStorage.removeItem('is_readonly');

      // 새로 받은 conversation_id 저장
      if (data.conversation_id) {
        localStorage.setItem('conversation_id', data.conversation_id);
        console.log('[DEBUG] 새 conversation_id 저장됨:', data.conversation_id);
      }
      
      // 페이지 이동 (약간의 딜레이로 저장 반영 보장)
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
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
      if (data.success) {
        // localStorage 클리어
        localStorage.removeItem('conversation_id');
        localStorage.removeItem('is_readonly');
        
        // 새로고침
        window.location.reload();
      }
    } catch (error) {
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  });
    
    
  // 이메일 중복확인
  const signupForm = document.getElementById('signupForm');
  const resetPwdForm = document.getElementById('resetPwdForm');

  async function checkEmail(email, emailMessage, sendBtn, timerId) {
    const email_value = email.value.trim();
    try {
      const response = await fetch('/api/check-email/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email_value })
      });
      const data = await response.json();

      if (data.success) {
        if(email.id=='email') {
          emailMessage.textContent = "사용 가능한 이메일입니다.";
          emailMessage.classList.add('field-success');
          emailMessage.classList.remove('field-error');
          emailVerified = true;
          sendBtn.textContent = '인증번호';
        } else {
          emailMessage.textContent = "존재하지 않는 이메일입니다.";
          emailMessage.classList.remove('field-success');
          emailMessage.classList.add('field-error');
        }
      } else {
        if(email.id=='email') {
          emailMessage.textContent = "이미 등록된 이메일입니다.";
          emailMessage.classList.remove('field-success');
          emailMessage.classList.add('field-error');
        } else {
          emailVerified = true;
          sendVerificationCode(email, emailMessage, timerId);
        }
      }
    } catch (error) {
      emailMessage.textContent = '중복확인 중 오류가 발생했습니다.';
      emailMessage.classList.remove('field-success');
      emailMessage.classList.add('field-error');
    }
  }
  
  // 인증번호 발송
  let verify = false;
  async function sendVerificationCode(email, emailMessage, sendBtn, timerId) {
    verify = false;
    sendBtn.disabled = true;
    const email_value = email.value.trim();
    try {
      const response = await fetch('/api/send-code/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email_value })
      });
      const data = await response.json();

      if (data.success) {
        emailMessage.textContent = data.message;
        email.disabled = true;
        startTimer(timerId);
      } else {
        emailMessage.textContent = data.message || '인증번호 발송 실패';
      }
    } catch (error) {
      emailMessage.textContent = '인증번호 발송 중 오류가 발생했습니다.';
    }
    sendBtn.disabled = false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function validateAndSendCode (form, sendBtn) {
    const email = form.elements['email'];
    const emailMessage = form.querySelector('[name="emailMessage"]');
    const timerId = form.querySelector('[name="timer"]').id;
    if (!email.value) {
      emailMessage.textContent = '이메일을 입력해주세요.';
      return;
    }
    if (!emailRegex.test(email.value)) {
      emailMessage.textContent = '올바른 이메일 형식이 아닙니다.';
      return;
    }
    
    if (!emailVerified) {
      await checkEmail(email, emailMessage, sendBtn, timerId);
    } else {
      await sendVerificationCode(email, emailMessage, sendBtn, timerId);
    }
  }

  sendCodeBtn && sendCodeBtn.addEventListener('click', async () => validateAndSendCode(signupForm, sendCodeBtn));
  resetPwd_sendCodeBtn && resetPwd_sendCodeBtn.addEventListener('click', async () => validateAndSendCode(resetPwdForm, resetPwd_sendCodeBtn));


  // 인증번호 검증
  const verifyBtn = document.getElementById('verifyCodeBtn');
  const resetPwd_verifyCodeBtn = document.getElementById('resetPwd_verifyCodeBtn');
  async function verifyCode(form, btn) {
    const email = form.elements['email'].value;
    const code = form.elements['code'].value;
    const verifyMessage = form.querySelector('[name="verifyMessage"]');
    const timerId = form.querySelector('[name="timer"]').id;
    verifyMessage.textContent = ''

    try {
      const response = await fetch('/api/verify-code/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await response.json();
      if (data.message) {
        verifyMessage.textContent = data.message;
        verifyMessage.classList.add('field-success');
        verifyMessage.classList.remove('field-error');
        btn.disabled = true;
        stopTimer(timerId);
        verify = true;
      } else {
        verifyMessage.textContent = (data.error || '인증 실패');
        verifyMessage.classList.add('field-error');
        verifyMessage.classList.remove('field-success');
      }
    } catch (error) {
      console.log(error)
      verifyMessage.textContent = ('인증 요청 중 오류 발생');
      verifyMessage.classList.add('field-error');
      verifyMessage.classList.remove('field-success');
    }
  }
  
  verifyBtn && verifyBtn.addEventListener('click', async () => verifyCode(signupForm, verifyBtn));
  resetPwd_verifyCodeBtn && resetPwd_verifyCodeBtn.addEventListener('click', async () => verifyCode(resetPwdForm, resetPwd_verifyCodeBtn));

  // 회원가입 처리
  signupForm && signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const code = codeInput.value.trim();
    const password = document.querySelector('input[name="pwd"]').value.trim();
    const confirmPassword = document.querySelector('input[name="pwd2"]').value.trim();

    pwdMessage.textContent = "";
    pwd2Message.textContent = "";

    const pwRegex = /^(?=.*[a-z])(?=.*\d)[a-z\d]{6,}$/;

    emailMessage.textContent = '';
    verifyMessage.textContent = '';
    pwdMessage.textContent = '';

    if (!email){
      emailMessage.textContent = '이메일을 입력해주세요.';
      return;
    }
    if (!code){
      verifyMessage.textContent = '인증번호를 입력해주세요.';
      return;
    }
    if(!verify){
      verifyMessage.textContent = '인증번호 확인을 진행하세요.'
      return; 
    }
    if (!pwRegex.test(password)) {
      pwdMessage.textContent = ("비밀번호는 영소문자와 숫자를 포함해 6자 이상이어야 합니다.");
      return;
    }

    if (password !== confirmPassword) {
      pwd2Message.textContent = ("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      const response = await fetch("/api/set_password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, confirm_password: confirmPassword })
      });

    const result = await response.json();
    if (result.success) {
      alert(result.message);

      // 모달 닫기
      closeModal(signupModal);

      // 홈 화면으로 이동
      openModal(loginModal);
    } else {
        alert(result.message);
      }
    } catch (error) {
      alert("서버 오류가 발생했습니다.");
      console.error(error);
    }
  });

  // 비번 재설정 입력 검증 나중에 넣어
  if(resetPwdForm) {
    resetPwdForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user_email = resetPwdForm.elements['email'].value;
      const newPassword = resetPwdForm.elements['pwd'].value;
      const resetPwd_emailMessage = document.getElementById('resetPwd_emailMessage')
      const resetPwd_verifyMessage = document.getElementById('resetPwd_emailMessage')
      try {
        const response = await fetch('/api/change-password/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_password: newPassword, user_email: user_email })
        });
        
        const data = await response.json();
        
        if(data.success) {
          alert('비밀번호가 변경되었습니다.');
          // 폼 초기화
          resetPwdForm.reset();
          resetPwd_emailMessage.textContent = ""
          resetPwd_verifyMessage.textContent = ""
          closeModal(resetPwdModal);
          // 홈 화면으로 이동
          openModal(loginModal);
        } else {
          alert('비밀번호 변경에 실패했습니다: ' + data.message);
        }
      } catch(error) {
        alert('오류가 발생했습니다.');
      }
    })
  }

  // 비밀번호 변경 로직
  const oldPasswordInput = document.getElementById('oldPassword');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const oldPwdError = document.getElementById('oldPwdError');
  const oldPwdSuccess = document.getElementById('oldPwdSuccess');
  const newPwdError = document.getElementById('newPwdError');
  const confirmPwdError = document.getElementById('confirmPwdError');
  const confirmPwdSuccess = document.getElementById('confirmPwdSuccess');
  const submitPwdChange = document.getElementById('submitPwdChange');
  
  let oldPasswordVerified = false;
  let newPasswordValid = false;
  let passwordsMatch = false;

  // 비밀번호 형식 검증 (영문, 숫자 포함 6자 이상)
  function validatePassword(password) {
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
    return regex.test(password);
  }

  // 기존 비밀번호 확인
  if(oldPasswordInput) {
    oldPasswordInput.addEventListener('input', async () => {
      const oldPwd = oldPasswordInput.value;
      
      if(oldPwd.length < 6) {
        oldPwdError.classList.add('hidden');
        oldPwdSuccess.classList.add('hidden');
        oldPasswordVerified = false;
        newPasswordInput.disabled = true;
        confirmPasswordInput.disabled = true;
        return;
      }

      try {
        // 기존 비밀번호 검증 API 호출
        const response = await fetch('/api/verify-password/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: oldPwd })
        });
        
        const data = await response.json();
        
        if(data.success) {
          oldPwdError.classList.add('hidden');
          oldPwdSuccess.classList.remove('hidden');
          oldPwdSuccess.textContent = '인증 완료';
          oldPasswordVerified = true;
          newPasswordInput.disabled = false;
        } else {
          oldPwdError.classList.remove('hidden');
          oldPwdError.textContent = '기존 비밀번호와 일치하지 않습니다.';
          oldPwdSuccess.classList.add('hidden');
          oldPasswordVerified = false;
          newPasswordInput.disabled = true;
          confirmPasswordInput.disabled = true;
        }
      } catch(error) {
        oldPwdError.classList.remove('hidden');
        oldPwdError.textContent = '오류가 발생했습니다.';
        oldPasswordVerified = false;
      }

      updateSubmitButton();
    });
  }

  // 새 비밀번호 검증
  if(newPasswordInput) {
    newPasswordInput.addEventListener('input', () => {
      const newPwd = newPasswordInput.value;
      
      if(newPwd.length === 0) {
        newPwdError.classList.add('hidden');
        newPasswordValid = false;
        confirmPasswordInput.disabled = true;
        updateSubmitButton();
        return;
      }
      
      if(!validatePassword(newPwd)) {
        newPwdError.classList.remove('hidden');
        newPwdError.textContent = '숫자, 영문자 포함 6자 이상이어야 합니다.';
        newPasswordValid = false;
        confirmPasswordInput.disabled = true;
      } else {
        newPwdError.classList.add('hidden');
        newPasswordValid = true;
        confirmPasswordInput.disabled = false;
      }
      
      // 새 비밀번호가 변경되면 확인 비밀번호 재검증
      if(confirmPasswordInput.value) {
        confirmPasswordInput.dispatchEvent(new Event('input'));
      }
      
      updateSubmitButton();
    });
  }

  // 새 비밀번호 재확인
  if(confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', () => {
      const confirmPwd = confirmPasswordInput.value;
      const newPwd = newPasswordInput.value;
      
      if(confirmPwd.length === 0) {
        confirmPwdError.classList.add('hidden');
        confirmPwdSuccess.classList.add('hidden');
        passwordsMatch = false;
        updateSubmitButton();
        return;
      }
      
      if(confirmPwd !== newPwd) {
        confirmPwdError.classList.remove('hidden');
        confirmPwdError.textContent = '새 비밀번호와 일치하지 않습니다.';
        confirmPwdSuccess.classList.add('hidden');
        passwordsMatch = false;
      } else {
        confirmPwdError.classList.add('hidden');
        confirmPwdSuccess.classList.remove('hidden');
        confirmPwdSuccess.textContent = '인증 완료';
        passwordsMatch = true;
      }
      
      updateSubmitButton();
    });
  }

  // 변경하기 버튼 활성화/비활성화
  function updateSubmitButton() {
    if(submitPwdChange) {
      if(oldPasswordVerified && newPasswordValid && passwordsMatch) {
        submitPwdChange.disabled = false;
      } else {
        submitPwdChange.disabled = true;
      }
    }
  }

  // 비밀번호 변경 폼 제출
  const changePwdForm = document.getElementById('changePwdForm');
  if(changePwdForm) {
    changePwdForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const newPassword = newPasswordInput.value;
      
      try {
        const response = await fetch('/api/change-password/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_password: newPassword })
        });
        
        const data = await response.json();
        
        if(data.success) {
          alert('비밀번호가 변경되었습니다.');
          closeModal(changePwdModal);
          // 폼 초기화
          changePwdForm.reset();
          oldPasswordVerified = false;
          newPasswordValid = false;
          passwordsMatch = false;
          newPasswordInput.disabled = true;
          confirmPasswordInput.disabled = true;
          submitPwdChange.disabled = true;
          oldPwdError.classList.add('hidden');
          oldPwdSuccess.classList.add('hidden');
          newPwdError.classList.add('hidden');
          confirmPwdError.classList.add('hidden');
          confirmPwdSuccess.classList.add('hidden');
        } else {
          alert('비밀번호 변경에 실패했습니다: ' + data.message);
        }
      } catch(error) {
        alert('오류가 발생했습니다.');
      }
    });
  }

  
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
    const conversation_id = localStorage.getItem('conversation_id'); // 저장된 conversation_id 가져오기

    try {
      // (4) RunPod 호출을 Django API에 요청
      const response = await fetch('/chat/api/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id, message, mode })
      });

      const data = await response.json();
      loadingMsg.remove(); // 로딩 메시지 제거

      // TTS
      if (isDriveMode && data.answer) {
        await playTTS_OpenAI(data.answer);
      }

      // (5) 첫 메시지일 경우에만 타이틀 변경
      if (data.is_first_message) {
        const conversationId = localStorage.getItem('conversation_id');
        const sidebarItem = document.querySelector(`.chat-item[data-id="${conversationId}"]`);

        // 사이드바에 해당 대화가 없으면 새로 만들어줌
        if (!sidebarItem) {
          const chatList = document.querySelector('.chat-list ul');
          sidebarItem = document.createElement('li');
          sidebarItem.className = 'chat-item';
          sidebarItem.dataset.id = conversationId;
          sidebarItem.textContent = '새 채팅';
          chatList.prepend(sidebarItem);
        }

        // 타이핑 효과 적용
        const newTitle = message.slice(0, 10) + (message.length > 10 ? '...' : '');
        sidebarItem.textContent = ''; 
        let i = 0;
        const typingInterval = setInterval(() => {
          sidebarItem.textContent += newTitle[i];
          i++;
          if (i >= newTitle.length) {
            clearInterval(typingInterval);
            sidebarItem.style.transition = 'color 0.3s ease';
            sidebarItem.style.color = '#6366f1';
            setTimeout(() => { sidebarItem.style.color = ''; }, 1000);
          }
        }, 80);
      }
      

      // (6) 응답 메시지 출력
      const botMsg = document.createElement('div');
      botMsg.className = 'message bot';
      botMsg.textContent = data.answer || data.error || '응답을 불러올 수 없습니다.';
      messagesDiv.appendChild(botMsg);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;

    } catch (error) {
      console.error('[ERROR] chatbot_api 호출 실패:', error);
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
  newChatBtn && newChatBtn.addEventListener('click', async () => {
    try {
      // (1) Django로 새 대화 생성 요청
      const response = await fetch('/create_conversation/', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        // (2) 새 conversation_id 저장
        localStorage.setItem('conversation_id', data.conversation_id);
        console.log('[NEW CHAT] 새로운 대화 생성됨:', data.conversation_id);

        // (3) 메시지 영역 초기화
        const messagesDiv = document.querySelector('.messages');
        if (messagesDiv) messagesDiv.innerHTML = '';

        // (4) 사이드바 항목 추가
        const chatList = document.querySelector('.chat-list ul');
        const newItem = document.createElement('li');
        newItem.className = 'chat-item';
        newItem.dataset.id = data.conversation_id;
        newItem.textContent = '새 채팅';
        chatList.prepend(newItem);

        // (5) 시각적 강조 효과
        newItem.style.transition = 'background 0.3s ease';
        newItem.style.background = '#3b3bff25';
        setTimeout(() => newItem.style.background = '', 800);

        // (6) 입력창 포커스
        const chatInput = document.getElementById('chatInput');
        if (chatInput) chatInput.focus();

        // (7) 읽기 전용 해제 + 배너 제거
        chatInput.disabled = false;
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) sendBtn.disabled = false;

        const banner = document.querySelector('.readonly-banner');
        if (banner) banner.remove();

        // 읽기모드 상태 초기화 (새 채팅 시)
        localStorage.removeItem('is_readonly');

      } else {
        alert('새 대화 생성 실패: ' + (data.error || '서버 오류'));
      }
    } catch (err) {
      alert('서버 통신 오류로 새 대화를 만들 수 없습니다.');
      console.error(err);
    }
  });


  // 이전 채팅 클릭 시 읽기 전용으로 불러오기
  document.addEventListener('click', async (e) => {
    const item = e.target.closest('.chat-item');
    if (!item) return;

    const conversationId = item.dataset.id;
    if (!conversationId) return;

    // 현재 클릭한 대화 ID를 localStorage에 저장
    localStorage.setItem('conversation_id', conversationId);
    console.log(`[READ ONLY] 이전 채팅 ${conversationId} 불러오기`);

    try {
      const messagesDiv = document.querySelector('.messages');
      const chatInput = document.getElementById('chatInput');
      const sendBtn = document.getElementById('sendBtn');

      if (messagesDiv) messagesDiv.innerHTML = '';

      // 서버에서 해당 대화 불러오기
      const res = await fetch(`/chat/load_conversation/?conversation_id=${conversationId}`);
      const data = await res.json();

      if (data.success && data.messages.length > 0) {
        data.messages.forEach(msg => {
          const msgDiv = document.createElement('div');
          msgDiv.className = `message ${msg.role === 'user' ? 'user' : 'bot'}`;
          msgDiv.textContent = msg.content;
          messagesDiv.appendChild(msgDiv);
        });
      } else {
        const msg = document.createElement('div');
        msg.className = 'message bot';
        msg.textContent = '이 대화에는 메시지가 없습니다.';
        messagesDiv.appendChild(msg);
      }

      // 읽기 전용 모드로 전환
      chatInput.disabled = true;
      sendBtn.disabled = true;

      // 읽기모드 상태 저장
      localStorage.setItem('is_readonly', 'true');

      // 안내 배너 추가 (중복 방지)
      let banner = document.querySelector('.readonly-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.className = 'readonly-banner';
        banner.textContent = '이전 대화 보기 (읽기 전용)';
        banner.style.cssText = `
          background: #f3f4f6;
          color: #555;
          text-align: center;
          padding: 8px;
          font-size: 13px;
          border-bottom: 1px solid #ddd;
        `;
        messagesDiv.parentNode.prepend(banner);
      }

      // 사이드바 active 효과
      document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');

    } catch (err) {
      console.error('[READ ONLY] 불러오기 오류:', err);
    }
  });

  // 탈퇴 버튼 클릭
  if (withdrawBtn) {
    withdrawBtn.addEventListener('click', () => {
      console.log('탈퇴 버튼 클릭됨');
      if (profileModal) profileModal.classList.add('hidden');
      if (withdrawModal) {
        withdrawModal.classList.remove('hidden');
        modalBackdrop.classList.remove('hidden');
      }
      if (withdrawPassword) withdrawPassword.value = '';
      if (withdrawError) withdrawError.classList.add('hidden');
    });
  }

  // 탈퇴 폼 제출 (비밀번호 검증)
  if (withdrawForm) {
    withdrawForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = withdrawPassword.value;
      try {
        const res = await fetch('/api/verify-password/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await res.json();
        if (data.success) {
          withdrawModal.classList.add('hidden');
          withdrawConfirmModal.classList.remove('hidden');
          modalBackdrop.classList.remove('hidden');
        } else {
          withdrawError.textContent = data.message || '비밀번호가 일치하지 않습니다.';
          withdrawError.classList.remove('hidden');
        }
      } catch (error) {
        withdrawError.textContent = '서버 오류가 발생했습니다.';
        withdrawError.classList.remove('hidden');
      }
    });
  }

  // 탈퇴 확인 모달 (확인 버튼)
  window.confirmWithdrawAction = async function() {
    try {
      const res = await fetch('/api/withdraw/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        withdrawConfirmModal.classList.add('hidden');
        withdrawSuccessModal.classList.remove('hidden');
        modalBackdrop.classList.remove('hidden');
      } else {
        alert(data.message || '탈퇴 처리 실패');
      }
    } catch (error) {
      alert('서버 오류로 탈퇴 실패');
    }
  };

  // 탈퇴 취소 버튼
  window.closeWithdrawConfirm = function() {
    withdrawConfirmModal.classList.add('hidden');
    modalBackdrop.classList.add('hidden');
  };

  // 탈퇴 완료 후 홈으로 이동
  window.goToHome = function() {
    window.location.href = '/';
  };

});
// 여까지가 둠




// 음성 입력 기능 (STT)
let recognition;
let isRecording = false;

// 브라우저 지원 확인
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();

  recognition.lang = "ko-KR";           // 한국어
  recognition.interimResults = true;     // 중간 결과 표시 (실시간 자막 효과)
  recognition.continuous = false;        // 한 문장 단위로 처리 (원하면 true로 변경 가능)

  recognition.onstart = () => {
    console.log("🎙️ 음성 인식 시작");
    micBtn.style.color = "#ff6600";     // 마이크 버튼 활성화 시 색상 변경
  };

  recognition.onend = () => {
    console.log("🛑 음성 인식 종료");
    micBtn.style.color = "";            // 비활성화 시 색상 복귀
    isRecording = false;
  };

  recognition.onerror = (event) => {
    console.error("❌ STT 오류:", event.error);
    micBtn.style.color = "";
    isRecording = false;
  };

  recognition.onresult = (event) => {
    let interim = "";
    let final = "";

    for (let i = 0; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) final += transcript + " ";
      else interim += transcript;
    }

    // 인식된 텍스트를 입력창에 실시간 반영
    chatInput.value = final + interim;
  };

  // 버튼 클릭 시 녹음 시작/정지 전환
  micBtn.addEventListener("click", () => {
    if (!isRecording) {
      recognition.start();
      isRecording = true;
    } else {
      recognition.stop();
    }
  });
} else {
  console.warn("⚠️ 브라우저가 음성 인식을 지원하지 않습니다.");
  micBtn.addEventListener("click", () => {
    alert("현재 브라우저에서는 음성 입력을 지원하지 않습니다.");
  });
}



// 사이드바 채팅 삭제 기능 
document.addEventListener("click", async (e) => {

  const deleteBtn = e.target.closest(".delete-btn");
  if (!deleteBtn) return;

  e.stopPropagation(); // chat-item 클릭 이벤트 방지
  const chatItem = deleteBtn.closest(".chat-item");
  const convoId = chatItem.dataset.id;

  if (!confirm("이 대화를 삭제하시겠습니까?")) return;

  try {
    const res = await fetch("/delete_conversation/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: convoId }),
    });

    const data = await res.json();
    if (data.success) {
      console.log(`[DELETE] 대화 ${convoId} 삭제됨`);
      chatItem.remove();

      // 현재 보고 있던 대화면 메시지창 초기화
      const currentId = localStorage.getItem("conversation_id");
      if (currentId === convoId) {
        const messagesDiv = document.querySelector(".messages");
        if (messagesDiv) {
          messagesDiv.innerHTML = "<div class='message bot'>삭제된 대화입니다.</div>";
        }
        localStorage.removeItem("conversation_id");
      }
    } else {
      alert("삭제 실패: " + (data.error || "Unknown error"));
    }
  } catch (err) {
    console.error("[DELETE ERROR]", err);
    alert("서버 오류로 삭제에 실패했습니다.");
  }
});
