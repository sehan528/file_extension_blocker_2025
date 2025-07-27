const Utils = {
    // 전역 변수 관리
    state: {
        currentUser: null, // AuthManager 에서 설정됨
        customExtensions: [],
        fixedExtensions: {}
    },

    // 현재 사용자 표시 업데이트
    updateCurrentUserDisplay() {
        const displayUser = this.state.currentUser || '미로그인';
        $('#current-user').text(displayUser);
    },

    // 계정 전환 (AuthManager로 대체됨)
    switchUser() {
        console.warn('⚠️ Utils.switchUser()는 더 이상 사용되지 않습니다. AuthManager.switchAccount()를 사용하세요.');

        // AuthManager가 있으면 해당 메서드 호출
        if (window.AuthManager) {
            window.AuthManager.switchAccount();
        } else {
            this.showAlert('인증 관리자를 찾을 수 없습니다.', 'error');
        }
    },

    // 알림 표시
    showAlert(message, type = 'info') {
        const colors = {
            success: 'bg-green-100 text-green-800 border-green-200',
            error: 'bg-red-100 text-red-800 border-red-200',
            warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            info: 'bg-blue-100 text-blue-800 border-blue-200'
        };

        const alert = $(`
            <div class="border-l-4 p-4 rounded-md ${colors[type]} mb-4">
                <div class="flex justify-between items-center">
                    <span>${message}</span>
                    <button onclick="$(this).parent().parent().remove()" class="text-lg font-bold opacity-70 hover:opacity-100">&times;</button>
                </div>
            </div>
        `);

        $('#alert-container').html(alert);
        setTimeout(() => alert.fadeOut(), 5000);
    },

    // 로딩 상태 관리
    setLoadingState(isLoading) {
        if (isLoading) {
            $('#add-extension-btn').prop('disabled', true).text('로딩 중...');
        } else {
            $('#add-extension-btn').prop('disabled', false).text('추가');
        }
    },

    // 확장자 정규화
    normalizeExtension(ext) {
        if (!ext) return '';
        return ext.toLowerCase().replace(/^\./, '');
    },

    // 확장자 차단 여부 확인 (클라이언트 사이드 미리보기용)
    checkIfBlocked(extension) {
        // 고정 확장자 체크
        if (this.state.fixedExtensions[extension] === true) {
            return true;
        }

        // 커스텀 확장자 체크 (커스텀은 항상 차단)
        if (this.state.customExtensions.includes(extension)) {
            return true;
        }

        return false;
    },

    // 위험한 확장자 체크
    checkRiskyExtension(extension) {
        const riskyExtensions = [
            'exe', 'dll', 'sys', 'bat', 'cmd', 'scr', 'com', 'cpl',
            'js', 'vbs', 'ps1', 'sh', 'py', 'rb', 'jar', 'class'
        ];

        return riskyExtensions.includes(extension.toLowerCase());
    },

    // 파일 확장자 추출
    extractFileExtension(filename) {
        if (!filename) return '';
        const parts = filename.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    },

    // 입력 검증
    validateExtensionInput(extension) {
        if (!extension || typeof extension !== 'string') {
            return { isValid: false, error: '확장자명을 입력해주세요.' };
        }

        const cleanExtension = extension.trim().toLowerCase();

        if (cleanExtension.length === 0) {
            return { isValid: false, error: '확장자명을 입력해주세요.' };
        }

        if (cleanExtension.length > 20) {
            return { isValid: false, error: '확장자명은 20자를 초과할 수 없습니다.' };
        }

        if (!/^[a-z0-9]+$/.test(cleanExtension)) {
            return { isValid: false, error: '확장자명은 영문과 숫자만 입력 가능합니다.' };
        }

        return { isValid: true, cleanExtension };
    },

    // 샘플 데이터 로드 (fallback)
    loadSampleData() {
        console.log('⚠️ 샘플 데이터 로드 (API 연결 실패 시 fallback)');

        this.state.fixedExtensions = { 'exe': true, 'bat': false };
        this.state.customExtensions = ['sh', 'ju', 'ch'];

        if (window.FixedExtensionManager) {
            window.FixedExtensionManager.updateDisplay(this.state.fixedExtensions);
        }

        if (window.CustomExtensionManager) {
            window.CustomExtensionManager.updateDisplay(this.state.customExtensions);
        }
    },

    // API 에러 처리 (인증 실패 시 AuthManager 호출)
    handleApiError(error, defaultMessage) {
        console.error('❌ API 오류:', error);

        // 인증 관련 오류인지 확인
        if (error.message && error.message.includes('인증이 필요합니다')) {
            console.log('🔒 인증 실패 감지 - AuthManager로 전달');

            if (window.AuthManager) {
                window.AuthManager.handleAuthFailure();
                return '인증이 만료되었습니다. 다시 로그인해주세요.';
            }
        }

        const message = error.message || defaultMessage;
        this.showAlert(message, 'error');
        return message;
    },

    // 현재 사용자 정보 가져오기 (AuthManager 연동)
    getCurrentUser() {
        if (window.AuthManager) {
            const user = window.AuthManager.getCurrentUser();
            return user ? user.userid : null;
        }
        return this.state.currentUser;
    },

    // 인증 상태 확인
    isAuthenticated() {
        if (window.AuthManager) {
            return window.AuthManager.isLoggedIn();
        }
        return false;
    },

    // 인증 필요 기능 실행 전 체크
    requireAuth() {
        if (window.AuthManager) {
            return window.AuthManager.requireAuth();
        }

        // AuthManager가 없는 경우 기본 동작
        if (!this.state.currentUser) {
            this.showAlert('로그인이 필요합니다.', 'warning');
            return false;
        }
        return true;
    },

    // 인증 상태 업데이트 (AuthManager 에서 호출)
    updateAuthState(user) {
        if (user) {
            this.state.currentUser = user.userid;
            console.log('✅ Utils 인증 상태 업데이트:', user.userid);
        } else {
            this.state.currentUser = null;
            console.log('🔒 Utils 인증 상태 초기화');
        }

        this.updateCurrentUserDisplay();
    },

    // 디버그 정보
    getDebugInfo() {
        return {
            state: { ...this.state },
            authStatus: this.isAuthenticated(),
            currentUser: this.getCurrentUser(),
            timestamp: new Date().toISOString()
        };
    }
};

// 전역으로 노출
window.Utils = Utils;