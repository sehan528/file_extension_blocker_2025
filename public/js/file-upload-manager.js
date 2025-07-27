const FileUploadManager = {
    // 초기화
    init() {
        console.log('🔧 파일 업로드 관리자 초기화');
        this.bindEvents();
    },

    // 이벤트 바인딩
    bindEvents() {
        // 파일 선택 버튼
        $('#select-file-btn').off('click').on('click', (e) => {
            e.preventDefault();
            console.log('📁 파일 선택 버튼 클릭');
            $('#file-input')[0].click();
        });

        // 드래그 앤 드롭 영역
        $('#drop-area').off('click').on('click', (e) => {
            e.preventDefault();
            console.log('📁 드롭 영역 클릭');
            $('#file-input')[0].click();
        });

        // 파일 선택 이벤트
        $('#file-input').off('change').on('change', (e) => {
            this.handleFileSelect(e);
        });

        // 드래그 앤 드롭 초기화
        this.initializeDragAndDrop();
    },

    // 드래그 앤 드롭 초기화
    initializeDragAndDrop() {
        const dropArea = $('#drop-area');

        // 기존 이벤트 제거
        dropArea.off('dragover dragleave drop');

        dropArea.on('dragover', (e) => {
            e.preventDefault();
            dropArea.addClass('border-blue-400 bg-blue-50');
        });

        dropArea.on('dragleave', (e) => {
            e.preventDefault();
            dropArea.removeClass('border-blue-400 bg-blue-50');
        });

        dropArea.on('drop', (e) => {
            e.preventDefault();
            dropArea.removeClass('border-blue-400 bg-blue-50');

            console.log('🎯 파일 드롭됨');
            const files = Array.from(e.originalEvent.dataTransfer.files);
            this.handleDroppedFiles(files);
        });
    },

    // 파일 선택 처리
    async handleFileSelect(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        console.log('📁 선택된 파일들:', files.map(f => f.name));

        // UI에서 즉시 미리보기 표시
        this.displayFilePreview(files);

        // 실제 서버 업로드 수행
        await this.uploadFiles(files);
    },

    // 드롭된 파일 처리
    async handleDroppedFiles(files) {
        console.log('🎯 드롭된 파일들:', files.map(f => f.name));

        // 파일 input에도 반영
        const fileInput = document.getElementById('file-input');
        const dataTransfer = new DataTransfer();
        files.forEach(file => dataTransfer.items.add(file));
        fileInput.files = dataTransfer.files;

        // 업로드 처리
        this.displayFilePreview(files);
        await this.uploadFiles(files);
    },

    // 파일 미리보기 표시
    displayFilePreview(files) {
        const resultDiv = $('#upload-result');
        resultDiv.removeClass('hidden').empty();

        files.forEach((file, index) => {
            const extension = Utils.extractFileExtension(file.name);
            const isBlocked = Utils.checkIfBlocked(extension);
            const hasRiskyExtension = Utils.checkRiskyExtension(extension);

            let statusClass = 'border-gray-200 bg-gray-50';
            let warningText = '';

            if (isBlocked) {
                statusClass = 'border-orange-200 bg-orange-50';
                warningText = ' (정책상 차단 예상)';
            } else if (hasRiskyExtension) {
                statusClass = 'border-yellow-200 bg-yellow-50';
                warningText = ' (보안 검증 필요)';
            }

            const fileItem = $(`
                <div id="file-${index}" class="flex justify-between items-center p-3 border rounded-lg ${statusClass}">
                    <div>
                        <div class="font-medium">${file.name}${warningText}</div>
                        <div class="text-sm text-gray-600">확장자: ${extension || '없음'} | 크기: ${(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">업로드 중...</span>
                        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                    </div>
                </div>
            `);

            resultDiv.append(fileItem);
        });
    },

    // 실제 파일 업로드
    async uploadFiles(files) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileItemId = `#file-${i}`;

            try {
                console.log(`📤 파일 업로드 시작: ${file.name}`);

                const response = await window.apiClient.uploadSingleFile(Utils.state.currentUser, file);

                if (response.success) {
                    // 성공 상태 업데이트
                    this.updateFileStatus(fileItemId, 'success', '업로드 완료');
                    console.log(`✅ 파일 업로드 성공: ${file.name}`, response.data);

                } else {
                    throw new Error(response.error);
                }

            } catch (error) {
                console.error(`❌ 파일 업로드 실패: ${file.name}`, error);
                this.updateFileStatus(fileItemId, 'error', '업로드 실패', error.message);
            }
        }

        Utils.showAlert('파일 업로드 처리가 완료되었습니다.', 'info');
    },

    // 파일 상태 업데이트
    updateFileStatus(fileItemId, status, statusText, errorMessage = null) {
        const statusColors = {
            success: 'border-green-200 bg-green-50',
            error: 'border-red-200 bg-red-50'
        };

        const statusIcons = {
            success: `
                <span class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">${statusText}</span>
                <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
            `,
            error: `
                <span class="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">${statusText}</span>
                <svg class="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
            `
        };

        // 상태 클래스 업데이트
        $(fileItemId).removeClass('border-gray-200 bg-gray-50 border-orange-200 bg-orange-50 border-yellow-200 bg-yellow-50')
            .addClass(statusColors[status]);

        // 상태 아이콘 업데이트
        $(fileItemId).find('.flex.items-center.space-x-2').html(statusIcons[status]);

        // 에러 메시지 표시
        if (status === 'error' && errorMessage) {
            const helpText = this.getHelpText(errorMessage);
            let errorHtml = `<div class="text-sm text-red-600 mt-1">❌ ${errorMessage}</div>`;

            if (helpText) {
                errorHtml += `<div class="text-xs text-blue-600 mt-1 bg-blue-50 p-2 rounded">${helpText}</div>`;
            }

            $(fileItemId).find('.text-sm.text-gray-600').after(errorHtml);
        }
    },

    // 에러 타입별 도움말 텍스트
    getHelpText(errorMessage) {
        if (errorMessage.includes('보고되었지만 실제로는')) {
            return '💡 파일 확장자를 올바르게 수정한 후 다시 업로드해주세요.';
        } else if (errorMessage.includes('정책에서 허용되지 않습니다')) {
            return '💡 관리자에게 확장자 허용 요청을 하거나 다른 형식으로 변환해주세요.';
        } else if (errorMessage.includes('파일 크기가 너무 큽니다')) {
            return '💡 파일을 압축하거나 더 작은 크기로 변환해주세요.';
        }
        return null;
    }
};

// 전역으로 노출
window.FileUploadManager = FileUploadManager;