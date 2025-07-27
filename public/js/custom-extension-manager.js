const CustomExtensionManager = {
    // 초기화
    init() {
        console.log('🔧 커스텀 확장자 관리자 초기화');
        this.bindEvents();
    },

    // 이벤트 바인딩
    bindEvents() {
        // 커스텀 확장자 추가 버튼
        $('#add-extension-btn').off('click').on('click', () => {
            this.addExtension();
        });

        // 엔터키로 추가
        $('#custom-extension-input').off('keypress').on('keypress', (e) => {
            if (e.which === 13) this.addExtension();
        });

        // X 버튼 이벤트 (이벤트 위임)
        this.bindRemoveEvents();
    },

    // X 버튼 이벤트 바인딩 (이벤트 위임 방식)
    bindRemoveEvents() {
        const container = $('#custom-extensions-area');

        container.off('click', '.remove-extension-btn');
        container.on('click', '.remove-extension-btn', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const extension = $(e.target).closest('.remove-extension-btn').data('extension');
            console.log('❌ X 버튼 클릭됨:', extension);

            this.removeExtension(extension);
        });
    },

    // 커스텀 확장자 UI 업데이트
    updateDisplay(extensions) {
        console.log('🔄 커스텀 확장자 UI 업데이트:', extensions);

        const container = $('#custom-extensions-area');
        container.empty();

        // 전역 상태 업데이트
        Utils.state.customExtensions = extensions || [];

        if (!extensions || extensions.length === 0) {
            container.html('<div class="text-center text-gray-500" id="no-custom-message">추가된 커스텀 확장자가 없습니다.</div>');
        } else {
            extensions.forEach(ext => {
                const displayExt = ext.startsWith('.') ? ext : `.${ext}`;
                const tag = $(`
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-200 text-gray-700 mr-2 mb-2" data-extension="${ext}">
                        ${displayExt}
                        <button class="remove-extension-btn ml-2 text-gray-500 hover:text-gray-700" data-extension="${ext}">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                            </svg>
                        </button>
                    </span>
                `);
                container.append(tag);
            });
        }

        this.updateCount();
        this.bindRemoveEvents(); // X 버튼 이벤트 재바인딩
    },

    // 커스텀 확장자 개수 업데이트
    updateCount() {
        $('#custom-count').text(Utils.state.customExtensions.length);
    },

    // 커스텀 확장자 추가
    async addExtension() {
        const input = $('#custom-extension-input');
        const extension = input.val().trim().toLowerCase();

        if (!extension) {
            Utils.showAlert('확장자를 입력해주세요.', 'warning');
            return;
        }

        // 입력 검증
        const validation = Utils.validateExtensionInput(extension);
        if (!validation.isValid) {
            Utils.showAlert(validation.error, 'warning');
            return;
        }

        // 고정 확장자 중복 체크
        const fixedExtensions = ['bat', 'cmd', 'com', 'cpl', 'exe', 'scr', 'js'];
        if (fixedExtensions.includes(validation.cleanExtension)) {
            Utils.showAlert(`${validation.cleanExtension}은 고정 확장자입니다. 위의 체크박스를 사용해주세요.`, 'warning');
            return;
        }

        // 기존 커스텀 확장자 중복 체크
        if (Utils.state.customExtensions.includes(validation.cleanExtension)) {
            Utils.showAlert('이미 추가된 확장자입니다.', 'warning');
            return;
        }

        // 200개 제한 체크
        if (Utils.state.customExtensions.length >= 200) {
            Utils.showAlert('커스텀 확장자는 최대 200개까지 추가할 수 있습니다.', 'warning');
            return;
        }

        try {
            const response = await window.apiClient.addCustomExtension(
                Utils.state.currentUser,
                validation.cleanExtension
            );

            if (response.success) {
                // 로컬 상태 업데이트
                Utils.state.customExtensions.push(validation.cleanExtension);
                this.updateDisplay(Utils.state.customExtensions);

                input.val(''); // 입력 필드 초기화
                Utils.showAlert(`${validation.cleanExtension} 확장자가 추가되었습니다.`, 'success');
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            Utils.handleApiError(error, '확장자 추가에 실패했습니다.');
        }
    },

    // 커스텀 확장자 제거
    async removeExtension(extension) {
        console.log('🗑️ 커스텀 확장자 삭제 시작:', extension);

        try {
            const response = await window.apiClient.deleteCustomExtension(
                Utils.state.currentUser,
                extension
            );

            console.log('🗑️ 삭제 API 응답:', response);

            if (response.success) {
                // 로컬 상태 업데이트
                Utils.state.customExtensions = Utils.state.customExtensions.filter(ext => ext !== extension);

                // UI 업데이트
                this.updateDisplay(Utils.state.customExtensions);

                Utils.showAlert(`${extension} 확장자가 제거되었습니다.`, 'success');
                console.log('✅ 커스텀 확장자 삭제 완료');
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            Utils.handleApiError(error, '확장자 제거에 실패했습니다.');
        }
    }
};

// 전역으로 노출
window.CustomExtensionManager = CustomExtensionManager;