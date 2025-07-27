// ===========================================
// 메인 애플리케이션 진입점 (무한 루프 방지)
// ===========================================

// 애플리케이션 초기화
$(document).ready(function() {
    console.log('🚀 파일 확장자 차단 시스템 로드 완료');

    // 중복 초기화 방지
    if (window.appInitialized) {
        console.log('이미 앱이 초기화됨 - 중단');
        return;
    }
    window.appInitialized = true;

    // 현재 페이지가 로그인 페이지인지 확인
    if (window.location.pathname.includes('login')) {
        console.log('로그인 페이지 - 메인 앱 초기화 생략');
        return;
    }

    // 인증 시스템 먼저 초기화
    initializeAuthSystem();
});

// 인증 시스템 초기화
async function initializeAuthSystem() {
    console.log('🔐 인증 시스템 초기화 시작');

    // 이미 리다이렉트 중이면 중단
    if (window.redirecting) {
        console.log('리다이렉트 진행 중 - 초기화 중단');
        return;
    }

    try {
        // AuthManager 초기화
        await AuthManager.init();

        // 인증 상태에 따른 UI 처리
        if (AuthManager.isAuthenticated) {
            await onAuthenticationSuccess();
        } else {
            onAuthenticationFailure();
        }

        // 로그아웃 이벤트 바인딩
        bindAuthEvents();

        // 주기적 인증 확인 시작
        AuthManager.startPeriodicCheck();

    } catch (error) {
        console.error('❌ 인증 시스템 초기화 실패:', error);
        onAuthenticationFailure();
    } finally {
        // 로딩 스피너 숨기기
        $('#auth-loading').fadeOut();
    }
}

// 인증 성공 시 처리
async function onAuthenticationSuccess() {
    console.log('✅ 인증 성공 - 애플리케이션 초기화');

    // 인증된 사용자 정보로 Utils 상태 업데이트
    const currentUser = AuthManager.getCurrentUser();
    if (currentUser) {
        Utils.state.currentUser = currentUser.userid;
        Utils.updateCurrentUserDisplay();
    }

    // 메인 콘텐츠 표시
    $('.auth-required').show();

    // 각 모듈 초기화
    await initializeModules();

    // 정책 로드
    PolicyManager.init();

    console.log('✅ 애플리케이션 초기화 완료');
}

// 인증 실패 시 처리 (무한 루프 방지 강화)
function onAuthenticationFailure() {
    console.log('🔒 인증 실패 감지');

    // 현재 페이지가 이미 로그인 페이지인 경우 리다이렉트하지 않음
    if (window.location.pathname.includes('login')) {
        console.log('이미 로그인 페이지에 있음 - 리다이렉트 중단');
        return;
    }

    // 이미 리다이렉트 중이면 중단
    if (window.redirecting) {
        console.log('이미 리다이렉트 진행 중 - 중단');
        return;
    }

    console.log('🔄 로그인 페이지로 리다이렉트');
    window.redirecting = true;

    // 지연 후 리다이렉트 (DOM 충돌 방지)
    setTimeout(() => {
        window.location.replace('/login.html');
    }, 100);
}

// 인증 관련 이벤트 바인딩
function bindAuthEvents() {
    // 로그아웃 버튼
    $('#logout-btn').off('click').on('click', async function() {
        console.log('🔓 로그아웃 버튼 클릭');

        const confirmed = confirm('로그아웃하시겠습니까?');
        if (confirmed) {
            await AuthManager.logout();
        }
    });
}

// 모듈 초기화 (기존과 동일하지만 async/await 지원)
async function initializeModules() {
    console.log('🔧 모듈들 초기화 시작');

    try {
        // 고정 확장자 관리자 초기화
        if (window.FixedExtensionManager) {
            FixedExtensionManager.init();
        } else {
            console.warn('⚠️ FixedExtensionManager 모듈이 로드되지 않았습니다.');
        }

        // 커스텀 확장자 관리자 초기화
        if (window.CustomExtensionManager) {
            CustomExtensionManager.init();
        } else {
            console.warn('⚠️ CustomExtensionManager 모듈이 로드되지 않았습니다.');
        }

        // 파일 업로드 관리자 초기화
        if (window.FileUploadManager) {
            FileUploadManager.init();
        } else {
            console.warn('⚠️ FileUploadManager 모듈이 로드되지 않았습니다.');
        }

        console.log('✅ 모든 모듈 초기화 완료');

    } catch (error) {
        console.error('❌ 모듈 초기화 중 오류:', error);
        Utils.showAlert('일부 기능 초기화에 실패했습니다.', 'warning');
    }
}

// 전역 함수들 (HTML에서 직접 호출) - 인증 체크 추가
function switchUser() {
    if (!AuthManager.requireAuth()) return;

    // 기존 계정 전환 로직을 AuthManager로 대체
    AuthManager.switchAccount();
}

// 디버그 함수들 (개발용) - 인증 체크 추가
function debugPolicyState() {
    if (!AuthManager.requireAuth()) return;

    if (window.PolicyManager) {
        PolicyManager.printDebugInfo();
    }
}

function exportPolicy() {
    if (!AuthManager.requireAuth()) return;

    if (window.PolicyManager) {
        PolicyManager.exportPolicy();
    }
}

function validatePolicy() {
    if (!AuthManager.requireAuth()) return;

    if (window.PolicyManager) {
        const validation = PolicyManager.validatePolicyState();
        if (validation.isValid) {
            Utils.showAlert('정책 상태가 정상입니다.', 'success');
        } else {
            Utils.showAlert(`정책 오류: ${validation.errors.join(', ')}`, 'error');
        }
    }
}

// 인증 관련 디버그 함수 추가
function debugAuthState() {
    console.group('🔐 인증 상태 디버그');
    console.log('AuthManager 정보:', AuthManager.getDebugInfo());
    console.log('현재 URL:', window.location.href);
    console.log('API 클라이언트:', window.apiClient ? '로드됨' : '로드 안됨');
    console.log('리다이렉트 상태:', {
        redirecting: window.redirecting,
        appInitialized: window.appInitialized
    });
    console.groupEnd();
}

// 리다이렉트 상태 초기화 (디버그용)
function resetRedirectState() {
    window.redirecting = false;
    window.appInitialized = false;
    console.log('✅ 리다이렉트 상태 초기화 완료');
}

// 전역 노출
window.switchUser = switchUser;
window.debugPolicyState = debugPolicyState;
window.exportPolicy = exportPolicy;
window.validatePolicy = validatePolicy;
window.debugAuthState = debugAuthState;
window.resetRedirectState = resetRedirectState;

// 개발 모드에서 디버그 함수들을 콘솔에 안내
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 개발 모드 디버그 함수들:');
    console.log('- debugAuthState(): 인증 상태 디버그');
    console.log('- resetRedirectState(): 리다이렉트 상태 초기화');
    console.log('- debugPolicyState(): 정책 상태 출력');
    console.log('- exportPolicy(): 정책 데이터 내보내기');
    console.log('- validatePolicy(): 정책 유효성 검사');
}