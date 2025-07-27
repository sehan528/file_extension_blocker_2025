const Utils = {
    // 전역 변수 관리
    state: {
        currentUser: 'demo1',
        customExtensions: [],
        fixedExtensions: {}
    },

    // 현재 사용자 표시 업데이트
    updateCurrentUserDisplay() {
        $('#current-user').text(this.state.currentUser);
    },

    // 계정 전환
    switchUser() {
        this.state.currentUser = this.state.currentUser === 'demo1' ? 'demo2' : 'demo1';
        this.updateCurrentUserDisplay();
        this.showAlert(`${this.state.currentUser} 계정으로 전환되었습니다.`, 'info');

        // 정책 다시 로드
        if (window.PolicyManager) {
            window.PolicyManager.loadPoliciesFromAPI();
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
        this.state.fixedExtensions = { 'exe': true, 'bat': false };
        this.state.customExtensions = ['sh', 'ju', 'ch'];

        if (window.FixedExtensionManager) {
            window.FixedExtensionManager.updateDisplay(this.state.fixedExtensions);
        }

        if (window.CustomExtensionManager) {
            window.CustomExtensionManager.updateDisplay(this.state.customExtensions);
        }
    },

    // API 에러 처리
    handleApiError(error, defaultMessage) {
        console.error('❌ API 오류:', error);
        const message = error.message || defaultMessage;
        this.showAlert(message, 'error');
        return message;
    }
};

// 전역으로 노출
window.Utils = Utils;