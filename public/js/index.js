// ===========================================
// 메인 애플리케이션 진입점 (모듈화 버전)
// ===========================================

// 애플리케이션 초기화
$(document).ready(function() {
    console.log('🚀 파일 확장자 차단 시스템 로드 완료 (모듈화 버전)');

    // 초기 사용자 표시
    Utils.updateCurrentUserDisplay();

    // 각 모듈 초기화
    initializeModules();

    // 정책 로드
    PolicyManager.init();
});

// 모듈 초기화
function initializeModules() {
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

// 전역 함수들 (HTML에서 직접 호출)
function switchUser() {
    Utils.switchUser();
}

// 디버그 함수들 (개발용)
function debugPolicyState() {
    if (window.PolicyManager) {
        PolicyManager.printDebugInfo();
    }
}

function exportPolicy() {
    if (window.PolicyManager) {
        PolicyManager.exportPolicy();
    }
}

function validatePolicy() {
    if (window.PolicyManager) {
        const validation = PolicyManager.validatePolicyState();
        if (validation.isValid) {
            Utils.showAlert('정책 상태가 정상입니다.', 'success');
        } else {
            Utils.showAlert(`정책 오류: ${validation.errors.join(', ')}`, 'error');
        }
    }
}

// 전역 노출
window.switchUser = switchUser;
window.debugPolicyState = debugPolicyState;
window.exportPolicy = exportPolicy;
window.validatePolicy = validatePolicy;

// 개발 모드에서 디버그 함수들을 콘솔에 안내
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 개발 모드 디버그 함수들:');
    console.log('- debugPolicyState(): 정책 상태 출력');
    console.log('- exportPolicy(): 정책 데이터 내보내기');
    console.log('- validatePolicy(): 정책 유효성 검사');
}