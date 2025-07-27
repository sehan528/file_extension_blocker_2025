const PolicyManager = {
    // 초기화
    init() {
        console.log('🔧 정책 관리자 초기화');
        this.loadPoliciesFromAPI();
    },

    // 정책 데이터를 API 에서 로드 (인증 체크 추가)
    async loadPoliciesFromAPI() {
        // 인증 상태 확인
        if (!Utils.requireAuth()) {
            console.log('🔒 인증되지 않은 상태 - 확장자 불러오기 중단');
            return;
        }

        const currentUser = Utils.getCurrentUser();
        console.log('🔍 확장자 불러오기 시작:', currentUser);

        if (!currentUser) {
            console.error('❌ 현재 사용자 정보를 찾을 수 없습니다');
            Utils.showAlert('사용자 정보를 확인할 수 없습니다.', 'error');
            return;
        }

        try {
            Utils.setLoadingState(true);
            const response = await window.apiClient.getPolicies(currentUser);
            console.log('📡 API 응답:', response);

            if (response.success) {
                const data = response.data;

                // 전역 상태 업데이트
                Utils.state.fixedExtensions = data.fixedExtensions || {};
                Utils.state.customExtensions = data.customExtensions || [];

                // 각 관리자에 데이터 전달
                if (window.FixedExtensionManager) {
                    window.FixedExtensionManager.updateDisplay(Utils.state.fixedExtensions);
                }

                if (window.CustomExtensionManager) {
                    window.CustomExtensionManager.updateDisplay(Utils.state.customExtensions);
                }

                console.log('✅ 확장자 불러오기 완료');
                Utils.showAlert('확장자 불러오기를 성공적으로 불러왔습니다.', 'success');
            } else {
                throw new Error(response.error || '확장자 목록을 불러오는데 실패했습니다.');
            }

        } catch (error) {
            console.error('❌ 확장자 불러오기 실패:', error);

            // 인증 관련 에러인지 확인
            if (error.message && error.message.includes('인증이 필요합니다')) {
                Utils.handleApiError(error, '');
                return;
            }

            Utils.showAlert('확장자 목록을 불러오는데 실패했습니다.', 'error');

            // 실패 시 샘플 데이터 로드
            Utils.loadSampleData();
        } finally {
            Utils.setLoadingState(false);
        }
    },

    // 정책 새로고침
    async refreshPolicies() {
        console.log('🔄 정책 새로고침');
        await this.loadPoliciesFromAPI();
    },

    // 현재 정책 상태 가져오기
    getCurrentPolicyState() {
        return {
            currentUser: Utils.getCurrentUser(),
            fixedExtensions: { ...Utils.state.fixedExtensions },
            customExtensions: [...Utils.state.customExtensions],
            totalCustomCount: Utils.state.customExtensions.length
        };
    },

    // 정책 유효성 검사
    validatePolicyState() {
        const errors = [];

        // 커스텀 확장자 개수 체크
        if (Utils.state.customExtensions.length > 200) {
            errors.push('커스텀 확장자가 200개를 초과했습니다.');
        }

        // 중복 확장자 체크
        const duplicates = Utils.state.customExtensions.filter((item, index) =>
            Utils.state.customExtensions.indexOf(item) !== index
        );

        if (duplicates.length > 0) {
            errors.push(`중복된 커스텀 확장자가 있습니다: ${duplicates.join(', ')}`);
        }

        // 고정 확장자와 커스텀 확장자 충돌 체크
        const fixedExtensionNames = Object.keys(Utils.state.fixedExtensions);
        const conflicts = Utils.state.customExtensions.filter(ext =>
            fixedExtensionNames.includes(ext)
        );

        if (conflicts.length > 0) {
            errors.push(`고정 확장자와 충돌하는 커스텀 확장자가 있습니다: ${conflicts.join(', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },

    // 정책 통계 정보
    getPolicyStatistics() {
        const fixedExtensionCount = Object.keys(Utils.state.fixedExtensions).length;
        const blockedFixedCount = Object.values(Utils.state.fixedExtensions).filter(Boolean).length;
        const customExtensionCount = Utils.state.customExtensions.length;

        return {
            fixedExtensions: {
                total: fixedExtensionCount,
                blocked: blockedFixedCount,
                allowed: fixedExtensionCount - blockedFixedCount
            },
            customExtensions: {
                total: customExtensionCount,
                remaining: Math.max(0, 200 - customExtensionCount)
            },
            totalBlocked: blockedFixedCount + customExtensionCount
        };
    },

    // 정책 내보내기 (JSON) - 인증 체크 추가
    exportPolicy() {
        if (!Utils.requireAuth()) return;

        const currentUser = Utils.getCurrentUser();
        const policyData = {
            exportDate: new Date().toISOString(),
            customer: currentUser,
            fixedExtensions: Utils.state.fixedExtensions,
            customExtensions: Utils.state.customExtensions,
            statistics: this.getPolicyStatistics()
        };

        const dataStr = JSON.stringify(policyData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `file-extension-policy-${currentUser}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        Utils.showAlert('정책 데이터를 내보냈습니다.', 'success');
    },

    // 정책 초기화 (신규 사용자용)
    async initializePolicyForNewUser() {
        const currentUser = Utils.getCurrentUser();
        if (!currentUser) {
            console.error('❌ 신규 사용자 확장자 초기화 실패: 사용자 정보 없음');
            return;
        }

        console.log('🆕 신규 사용자 확장자 초기화:', currentUser);

        // 기본 고정 확장자 7개 (모두 unCheck 상태)
        const defaultFixedExtensions = {
            'bat': false,
            'cmd': false,
            'com': false,
            'cpl': false,
            'exe': false,
            'scr': false,
            'js': false
        };

        // 로컬 상태 설정
        Utils.state.fixedExtensions = defaultFixedExtensions;
        Utils.state.customExtensions = [];

        // UI 업데이트
        if (window.FixedExtensionManager) {
            window.FixedExtensionManager.updateDisplay(defaultFixedExtensions);
        }

        if (window.CustomExtensionManager) {
            window.CustomExtensionManager.updateDisplay([]);
        }

        console.log('✅ 신규 사용자 정책 초기화 완료');
    },

    // 디버그 정보 출력
    printDebugInfo() {
        if (!Utils.requireAuth()) return;

        console.group('🔍 확장자 관리자 디버그 정보');
        console.log('현재 사용자:', Utils.getCurrentUser());
        console.log('인증 상태:', Utils.isAuthenticated());
        console.log('고정 확장자:', Utils.state.fixedExtensions);
        console.log('커스텀 확장자:', Utils.state.customExtensions);
        console.log('확장자 통계:', this.getPolicyStatistics());
        console.log('확장자 유효성:', this.validatePolicyState());

        if (window.AuthManager) {
            console.log('인증 관리자 상태:', window.AuthManager.getDebugInfo());
        }

        console.groupEnd();
    }
};

// 전역으로 노출
window.PolicyManager = PolicyManager;