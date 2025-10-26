// main.js - 완성된 UI 제어
document.addEventListener('DOMContentLoaded', function(){
  console.log('JavaScript loaded'); 
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const profileBtn = document.getElementById('profileBtn');
  const changePwdBtn = document.getElementById('changePwdBtn');
  const withdrawBtn = document.getElementById('withdrawBtn');
  const changePwdModal = document.getElementById('changePwdModal');

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

  // 탈퇴 관련 변수
  const withdrawModal = document.getElementById('withdrawModal');
  const withdrawConfirmModal = document.getElementById('withdrawConfirmModal');
  const withdrawSuccessModal = document.getElementById('withdrawSuccessModal');
  const withdrawForm = document.getElementById('withdrawForm');
  const withdrawPassword = document.getElementById('withdrawPassword');
  const withdrawError = document.getElementById('withdrawError');

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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      emailMessage.textContent = '올바른 이메일 형식이 아닙니다.';
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
        emailMessage.textContent = '중복확인 중 오류가 발생했습니다.';
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
          emailMessage.textContent = data.message;
          emailInput.disabled = true;
        } else {
          emailMessage.textContent = (data.message || '인증번호 발송 실패');
        }
      } catch (error) {
        emailMessage.textContent = '인증번호 발송 중 오류가 발생했습니다.';
      }
    }
  });

  // 인증번호 검증
  const verifyBtn = document.getElementById('verifyCodeBtn');
  verifyBtn && verifyBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const code = codeInput.value.trim();
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
        verifyBtn.disabled = true;
      } else {
        verifyMessage.textContent = (data.error || '인증 실패');
      }
    } catch (error) {
      verifyMessage.textContent = ('인증 요청 중 오류 발생');
    }
  });

  // 회원가입 처리
  const signupForm = document.getElementById('signupForm');
  signupForm && signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const code = codeInput.value.trim();
    const password = document.querySelector('input[name="pwd"]').value.trim();
    const confirmPassword = document.querySelector('input[name="pwd2"]').value.trim();

    pwdMessage.textContent = "";
    pwd2Message.textContent = "";

    const pwRegex = /^(?=.*[a-z])(?=.*\d)[a-z\d]{6,}$/;

    if (!email){
      emailMessage.textContent = '이메일을 입력해주세요.';
      return;
    }
    if (!code){
      verifyMessage.textContent = '인증번호를 입력해주세요.';
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

      const response = await fetch('/chat/api/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id, message, mode })
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
// 여까지가 둠


// 탈퇴 버튼 클릭 (프로필 모달에서) 
if(withdrawBtn) {
  withdrawBtn.addEventListener('click', () => {
    console.log('탈퇴 버튼 클릭됨');
    
    if(profileModal) {
      profileModal.classList.add('hidden');
    }
    
    if(withdrawModal) {
      withdrawModal.classList.remove('hidden');
      modalBackdrop.classList.remove('hidden');
    }
    
    // 폼 초기화
    if(withdrawPassword) {
      withdrawPassword.value = '';
    }
    if(withdrawError) {
      withdrawError.classList.add('hidden');
    }
  });
}

// 탈퇴 폼 제출 - 비밀번호 확인
if(withdrawForm) {
  withdrawForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const password = withdrawPassword.value;
    
    try {
      const response = await fetch('/api/verify-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password })
      });
      
      const data = await response.json();
      
      if(data.success) {
        withdrawModal.classList.add('hidden');
        withdrawConfirmModal.classList.remove('hidden');
        modalBackdrop.classList.remove('hidden');
      } else {
        withdrawError.textContent = data.message || '비밀번호가 일치하지 않습니다.';
        withdrawError.classList.remove('hidden');
      }
    } catch(error) {
      withdrawError.textContent = '오류가 발생했습니다.';
      withdrawError.classList.remove('hidden');
    }
  });
}

// 탈퇴 확인 모달 닫기
function closeWithdrawConfirm() {
  const withdrawConfirmModal = document.getElementById('withdrawConfirmModal');
  const modalBackdrop = document.getElementById('modalBackdrop');

  if(withdrawConfirmModal) {
    withdrawConfirmModal.classList.add('hidden');
  }
  if(modalBackdrop) {
    modalBackdrop.classList.add('hidden');
  }
}

// 실제 탈퇴 처리
async function confirmWithdrawAction() {
  try {
    const response = await fetch('/api/withdraw/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if(data.success) {
      closeWithdrawConfirm();
      const withdrawSuccessModal = document.getElementById('withdrawSuccessModal');
      const modalBackdrop = document.getElementById('modalBackdrop');
      
      if(withdrawSuccessModal) {
        withdrawSuccessModal.classList.remove('hidden');
        modalBackdrop.classList.remove('hidden');
      }
    } else {
      alert(data.message || '탈퇴 처리 중 오류가 발생했습니다.');
      closeWithdrawConfirm();
    }
  } catch(error) {

    alert('오류가 발생했습니다.');
    closeWithdrawConfirm();
  }
}

// 홈으로 이동
function goToHome() {
  window.location.href = '/';
}

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

    // 🧩 인식된 텍스트를 입력창에 실시간 반영
    chatInput.value = final + interim;
  };

  // 🎤 버튼 클릭 시 녹음 시작/정지 전환
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