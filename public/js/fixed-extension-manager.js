const FixedExtensionManager = {
    // 초기화
    init() {
        console.log('🔧 고정 확장자 관리자 초기화');
        this.bindEvents();
    },

    // 이벤트 바인딩
    bindEvents() {
        const container = $('#fixed-extensions');

        // 기존 이벤트 제거 후 재등록
        container.off('change', 'input[type="checkbox"]');
        container.on('change', 'input[type="checkbox"]', (e) => {
            const extension = $(e.target).data('extension');
            const isBlocked = $(e.target).is(':checked');
            this.updateExtension(extension, isBlocked);
        });
    },

    // 고정 확장자 UI 업데이트
    updateDisplay(fixedExtensionsData) {
        console.log('🔄 고정 확장자 UI 업데이트:', fixedExtensionsData);

        const container = $('#fixed-extensions');
        container.empty();

        // 전역 상태 업데이트
        Utils.state.fixedExtensions = fixedExtensionsData;

        // 고정 확장자들에 대해 체크박스 생성
        Object.keys(fixedExtensionsData).forEach(extension => {
            const isChecked = fixedExtensionsData[extension];

            const checkbox = $(`
                <label class="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" class="form-checkbox h-4 w-4 text-red-600 rounded" 
                            data-extension="${extension}" ${isChecked ? 'checked' : ''}>
                    <span class="text-sm text-gray-700">${extension}</span>
                </label>
            `);

            container.append(checkbox);
        });

        // 이벤트 재바인딩
        this.bindEvents();
    },

    // 고정 확장자 업데이트
    async updateExtension(extension, isBlocked) {
        console.log(`🔄 고정 확장자 업데이트: ${extension} = ${isBlocked}`);

        try {
            const response = await window.apiClient.updateFixedExtension(
                Utils.state.currentUser,
                extension,
                isBlocked
            );

            if (response.success) {
                // 로컬 상태 업데이트
                Utils.state.fixedExtensions[extension] = isBlocked;

                Utils.showAlert(
                    `${extension} 확장자가 ${isBlocked ? '차단' : '허용'} 되었습니다.`,
                    'success'
                );
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            Utils.handleApiError(error, '고정 확장자 업데이트에 실패했습니다.');

            // 체크박스 상태 되돌리기
            $(`input[data-extension="${extension}"]`).prop('checked', !isBlocked);
        }
    },

    // 고정 확장자 입력 검증
    validateInput(extension, isBlocked) {
        if (!extension || typeof isBlocked !== 'boolean') {
            return {
                isValid: false,
                error: '확장자명과 차단 여부를 올바르게 입력해주세요.'
            };
        }

        const fixedExtensions = ['bat', 'cmd', 'com', 'cpl', 'exe', 'scr', 'js'];
        if (!fixedExtensions.includes(extension)) {
            return {
                isValid: false,
                error: '유효하지 않은 고정 확장자입니다.'
            };
        }

        return { isValid: true };
    }
};

// 전역으로 노출
window.FixedExtensionManager = FixedExtensionManager;