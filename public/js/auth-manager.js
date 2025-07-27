const AuthManager = {
    // 현재 사용자 정보
    currentUser: null,
    isAuthenticated: false,
    isInitialized: false,

    // 초기화
    async init() {
        console.log('🔐 인증 관리자 초기화 시작');

        try {
            await this.checkAuthStatus();
            this.isInitialized = true;
            console.log('✅ 인증 관리자 초기화 완료');
        } catch (error) {
            console.error('❌ 인증 관리자 초기화 실패:', error);
            this.handleAuthFailure();
        }
    },

    // 인증 상태 확인
    async checkAuthStatus() {
        try {
            const response = await window.apiClient.request('/api/auth/verify');

            if (response.success) {
                this.setAuthenticatedUser(response.data.user);
                return true;
            } else {
                this.clearAuthentication();
                return false;
            }

        } catch (error) {
            console.log('미인증 상태:', error.message);
            this.clearAuthentication();
            return false;
        }
    },

    // 인증된 사용자 설정
    setAuthenticatedUser(user) {
        this.currentUser = user;
        this.isAuthenticated = true;

        console.log('✅ 인증된 사용자:', user.userid);

        // Utils 상태 업데이트
        if (window.Utils) {
            window.Utils.state.currentUser = user.userid;
            window.Utils.updateCurrentUserDisplay();
        }

        // UI 업데이트
        this.updateAuthUI();
    },

    // 인증 해제
    clearAuthentication() {
        this.currentUser = null;
        this.isAuthenticated = false;

        console.log('🔒 인증 해제됨');

        // Utils 상태 초기화
        if (window.Utils) {
            window.Utils.state.currentUser = null;
        }

        // UI 업데이트
        this.updateAuthUI();
    },

    // 로그인 처리
    async login(userid, password) {
        try {
            const response = await window.apiClient.request('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ userid, password })
            });

            if (response.success) {
                this.setAuthenticatedUser(response.data.user);

                // 정책 다시 로드
                if (window.PolicyManager) {
                    await window.PolicyManager.loadPoliciesFromAPI();
                }

                return { success: true, user: response.data.user };
            } else {
                return { success: false, error: response.error };
            }

        } catch (error) {
            console.error('❌ 로그인 실패:', error);
            return { success: false, error: error.message };
        }
    },

    // 로그아웃 처리
    async logout() {
        try {
            await window.apiClient.request('/api/auth/logout', {
                method: 'POST'
            });

        } catch (error) {
            console.error('❌ 로그아웃 API 실패:', error);
        } finally {
            // API 실패해도 클라이언트에서는 로그아웃 처리
            this.clearAuthentication();

            // 로그인 페이지로 리다이렉트
            window.location.href = '/login.html';
        }
    },

    // 인증 실패 처리 (무한 루프 방지 강화)
    handleAuthFailure() {
        // 이미 로그인 페이지에 있으면 리다이렉트하지 않음
        if (window.location.pathname.includes('login')) {
            console.log('이미 로그인 페이지에 있음 - 리다이렉트 중단');
            return;
        }

        // 리다이렉트 플래그 체크
        if (window.redirecting) {
            console.log('이미 리다이렉트 진행 중 - 중단');
            return;
        }

        this.clearAuthentication();

        console.log('🔄 로그인 페이지로 리다이렉트');
        window.redirecting = true;

        // 안전한 리다이렉트
        setTimeout(() => {
            window.location.replace('/login.html');
        }, 100);
    },

    // 인증 필요 페이지 보호
    requireAuth() {
        if (!this.isAuthenticated) {
            console.log('🔒 인증이 필요합니다');
            this.handleAuthFailure();
            return false;
        }
        return true;
    },

    // UI 업데이트
    updateAuthUI() {
        // 현재 사용자 표시 업데이트
        if (this.isAuthenticated && this.currentUser) {
            $('#current-user').text(this.currentUser.userid);
            $('.user-name').text(this.currentUser.name);
            $('.auth-required').show();
            $('.auth-hidden').hide();
        } else {
            $('#current-user').text('미로그인');
            $('.user-name').text('');
            $('.auth-required').hide();
            $('.auth-hidden').show();
        }
    },

    // 계정 전환 (기존 함수 대체)
    async switchAccount() {
        if (!this.isAuthenticated) {
            if (window.Utils) {
                window.Utils.showAlert('로그인이 필요합니다.', 'warning');
            }
            return;
        }

        // 현재는 로그아웃 처리 (실제 계정 전환은 로그인 페이지에서)
        const confirmed = confirm('다른 계정으로 전환하시겠습니까? (로그아웃됩니다)');
        if (confirmed) {
            await this.logout();
        }
    },

    // 사용자 정보 조회
    getCurrentUser() {
        return this.currentUser;
    },

    // 인증 상태 조회
    isLoggedIn() {
        return this.isAuthenticated;
    },

    // 세션 연장 (자동 호출)
    async extendSession() {
        if (!this.isAuthenticated) return;

        try {
            // 세션 검증 요청으로 자동 연장
            await this.checkAuthStatus();
        } catch (error) {
            console.error('❌ 세션 연장 실패:', error);
            this.handleAuthFailure();
        }
    },

    // 주기적 인증 확인 시작
    startPeriodicCheck() {
        // 5분마다 인증 상태 확인
        setInterval(() => {
            if (this.isAuthenticated) {
                this.extendSession();
            }
        }, 5 * 60 * 1000);

        console.log('🕐 주기적 인증 확인 시작 (5분 간격)');
    },

    // 디버그 정보
    getDebugInfo() {
        return {
            isAuthenticated: this.isAuthenticated,
            isInitialized: this.isInitialized,
            currentUser: this.currentUser,
            timestamp: new Date().toISOString()
        };
    }
};

// 전역으로 노출
window.AuthManager = AuthManager;