// 전역 변수
let currentUser = 'demo2';
let customExtensions = [];
let fixedExtensions = {};

// 페이지 로드 시 초기화
$(document).ready(function() {
    console.log('🚀 파일 확장자 차단 시스템 로드 완료');
    updateCurrentUserDisplay();
    initializeEventListeners();
    loadPoliciesFromAPI();
});

// 현재 사용자 표시 업데이트
function updateCurrentUserDisplay() {
    $('#current-user').text(currentUser);
}

// 계정 전환
function switchUser() {
    currentUser = currentUser === 'demo1' ? 'demo2' : 'demo1';
    updateCurrentUserDisplay();
    showAlert(`${currentUser} 계정으로 전환되었습니다.`, 'info');
    loadPoliciesFromAPI();
}

// 이벤트 리스너 초기화 (완전히 개선됨)
function initializeEventListeners() {
    console.log('🔧 이벤트 리스너 초기화 시작');

    // 커스텀 확장자 추가
    $('#add-extension-btn').off('click').on('click', addCustomExtension);

    $('#custom-extension-input').off('keypress').on('keypress', function(e) {
        if (e.which === 13) addCustomExtension();
    });

    // 파일 업로드 - 개별 이벤트 등록
    $('#select-file-btn').off('click').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('📁 파일 선택 버튼 클릭');
        $('#file-input')[0].click(); // DOM 메서드 직접 호출
    });

    $('#upload-area').off('click').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('📁 업로드 영역 클릭');
        $('#file-input')[0].click(); // DOM 메서드 직접 호출
    });

    $('#file-input').off('change').on('change', handleFileSelect);

    // 드래그 앤 드롭
    initializeDragAndDrop();

    console.log('✅ 이벤트 리스너 초기화 완료');
}

// 정책 데이터를 API에서 로드
async function loadPoliciesFromAPI() {
    console.log('🔍 정책 로드 시작:', currentUser);

    try {
        showLoadingState();
        const response = await window.apiClient.getPolicies(currentUser);
        console.log('📡 API 응답:', response);

        if (response.success) {
            const data = response.data;

            // 고정 확장자 UI 생성 및 상태 설정
            updateFixedExtensionsDisplay(data.fixedExtensions);

            // 커스텀 확장자 표시
            customExtensions = data.customExtensions || [];
            updateCustomExtensionsDisplay(customExtensions);

            console.log('✅ 정책 로드 완료');
            showAlert('정책을 성공적으로 불러왔습니다.', 'success');
        } else {
            throw new Error(response.error || '정책을 불러오는데 실패했습니다.');
        }

    } catch (error) {
        console.error('❌ 정책 로드 실패:', error);
        showAlert('정책을 불러오는데 실패했습니다.', 'error');
        loadSampleData();
    } finally {
        hideLoadingState();
    }
}

// 고정 확장자 UI 업데이트 (이벤트 중복 방지)
function updateFixedExtensionsDisplay(fixedExtensionsData) {
    const container = $('#fixed-extensions');
    container.empty();

    fixedExtensions = fixedExtensionsData;

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

    // 이벤트 리스너 재등록 (기존 이벤트 제거 후 등록)
    container.off('change', 'input[type="checkbox"]'); // 기존 이벤트 제거
    container.on('change', 'input[type="checkbox"]', function() {
        const extension = $(this).data('extension');
        const isBlocked = $(this).is(':checked');
        updateFixedExtension(extension, isBlocked);
    });
}

// 커스텀 확장자 표시 업데이트 (확장자 앞에 . 추가)
function updateCustomExtensionsDisplay(extensions) {
    const container = $('#custom-extensions-area');
    container.empty();

    if (!extensions || extensions.length === 0) {
        container.html('<div class="text-center text-gray-500" id="no-custom-message">추가된 커스텀 확장자가 없습니다.</div>');
    } else {
        extensions.forEach(ext => {
            const displayExt = ext.startsWith('.') ? ext : `.${ext}`; // . 추가
            const tag = $(`
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-200 text-gray-700 mr-2 mb-2">
                    ${displayExt}
                    <button onclick="removeCustomExtension('${ext}')" class="ml-2 text-gray-500 hover:text-gray-700">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                        </svg>
                    </button>
                </span>
            `);
            container.append(tag);
        });
    }

    updateCustomCount();
}

// 커스텀 확장자 개수 업데이트
function updateCustomCount() {
    $('#custom-count').text(customExtensions.length);
}

// 고정 확장자 업데이트
async function updateFixedExtension(extension, isBlocked) {
    try {
        const response = await window.apiClient.updateFixedExtension(currentUser, extension, isBlocked);

        if (response.success) {
            showAlert(`${extension} 확장자가 ${isBlocked ? '차단' : '허용'} 되었습니다.`, 'success');
        } else {
            throw new Error(response.error);
        }
    } catch (error) {
        console.error('❌ 고정 확장자 업데이트 실패:', error);
        showAlert(error.message || '업데이트에 실패했습니다.', 'error');

        // 체크박스 상태 되돌리기
        $(`input[data-extension="${extension}"]`).prop('checked', !isBlocked);
    }
}

// 커스텀 확장자 추가
async function addCustomExtension() {
    const input = $('#custom-extension-input');
    const extension = input.val().trim().toLowerCase();

    if (!extension) {
        showAlert('확장자를 입력해주세요.', 'warning');
        return;
    }

    try {
        const response = await window.apiClient.addCustomExtension(currentUser, extension);

        if (response.success) {
            customExtensions.push(extension);
            updateCustomExtensionsDisplay(customExtensions);
            input.val('');
            showAlert(`${extension} 확장자가 추가되었습니다.`, 'success');
        } else {
            throw new Error(response.error);
        }
    } catch (error) {
        console.error('❌ 커스텀 확장자 추가 실패:', error);
        showAlert(error.message || '확장자 추가에 실패했습니다.', 'error');
    }
}

// 커스텀 확장자 제거
async function removeCustomExtension(extension) {
    try {
        const response = await window.apiClient.deleteCustomExtension(currentUser, extension);

        if (response.success) {
            customExtensions = customExtensions.filter(ext => ext !== extension);
            updateCustomExtensionsDisplay(customExtensions);
            showAlert(`${extension} 확장자가 제거되었습니다.`, 'success');
        } else {
            throw new Error(response.error);
        }
    } catch (error) {
        console.error('❌ 커스텀 확장자 제거 실패:', error);
        showAlert(error.message || '확장자 제거에 실패했습니다.', 'error');
    }
}

// ======================================
// 📤 파일 업로드 기능
// ======================================

// 파일 선택 처리 (실제 업로드 기능)
async function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    console.log('📁 선택된 파일들:', files.map(f => f.name));

    // UI에서 즉시 미리보기 표시
    displayFilePreview(files);

    // 실제 서버 업로드 수행
    await uploadFiles(files);
}

// 파일 미리보기 표시
function displayFilePreview(files) {
    const resultDiv = $('#upload-result');
    resultDiv.removeClass('hidden').empty();

    files.forEach((file, index) => {
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        const isBlocked = checkIfBlocked(extension);
        const hasRiskyExtension = checkRiskyExtension(extension);

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
}

// 실제 파일 업로드
async function uploadFiles(files) {
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileItemId = `#file-${i}`;

        try {
            console.log(`📤 파일 업로드 시작: ${file.name}`);

            const response = await window.apiClient.uploadSingleFile(currentUser, file);

            if (response.success) {
                // 성공 상태 업데이트
                $(fileItemId).removeClass('border-gray-200 bg-gray-50 border-orange-200 bg-orange-50 border-yellow-200 bg-yellow-50')
                    .addClass('border-green-200 bg-green-50');
                $(fileItemId).find('.flex.items-center.space-x-2').html(`
                    <span class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">업로드 완료</span>
                    <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                `);

                console.log(`✅ 파일 업로드 성공: ${file.name}`, response.data);

            } else {
                throw new Error(response.error);
            }

        } catch (error) {
            console.error(`❌ 파일 업로드 실패: ${file.name}`, error);

            // 실패 상태 업데이트
            $(fileItemId).removeClass('border-gray-200 bg-gray-50 border-orange-200 bg-orange-50 border-yellow-200 bg-yellow-50')
                .addClass('border-red-200 bg-red-50');

            // 에러 타입에 따른 상세 메시지 표시
            let errorMessage = error.message;
            let helpText = '';

            // 확장자 위조 탐지 시 특별 처리
            if (error.message.includes('보고되었지만 실제로는')) {
                helpText = '💡 파일 확장자를 올바르게 수정한 후 다시 업로드해주세요.';
            } else if (error.message.includes('정책에서 허용되지 않습니다')) {
                helpText = '💡 관리자에게 확장자 허용 요청을 하거나 다른 형식으로 변환해주세요.';
            } else if (error.message.includes('파일 크기가 너무 큽니다')) {
                helpText = '💡 파일을 압축하거나 더 작은 크기로 변환해주세요.';
            }

            $(fileItemId).find('.flex.items-center.space-x-2').html(`
                <span class="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">업로드 실패</span>
                <svg class="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
            `);

            // 에러 메시지 추가 (더 상세하게)
            let errorHtml = `<div class="text-sm text-red-600 mt-1">❌ ${errorMessage}</div>`;
            if (helpText) {
                errorHtml += `<div class="text-xs text-blue-600 mt-1 bg-blue-50 p-2 rounded">${helpText}</div>`;
            }

            $(fileItemId).find('.text-sm.text-gray-600').after(errorHtml);
        }
    }

    showAlert('파일 업로드 처리가 완료되었습니다.', 'info');
}

// 위험한 확장자 체크 (클라이언트 사이드)
function checkRiskyExtension(extension) {
    const riskyExtensions = [
        'exe', 'dll', 'sys', 'bat', 'cmd', 'scr', 'com', 'cpl',
        'js', 'vbs', 'ps1', 'sh', 'py', 'rb', 'jar', 'class'
    ];

    return riskyExtensions.includes(extension.toLowerCase());
}

// 드롭된 파일 처리
async function handleDroppedFiles(files) {
    console.log('🎯 드롭된 파일들:', files.map(f => f.name));

    // 파일 input에도 반영
    const fileInput = document.getElementById('file-input');
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    fileInput.files = dataTransfer.files;

    // 업로드 처리
    displayFilePreview(files);
    await uploadFiles(files);
}

// ======================================
// 기타 유틸리티 함수들
// ======================================

// 확장자 차단 여부 확인 (클라이언트 사이드 미리보기용)
function checkIfBlocked(extension) {
    // 고정 확장자 체크
    if (fixedExtensions[extension] === true) {
        return true;
    }

    // 커스텀 확장자 체크 (커스텀은 항상 차단)
    if (customExtensions.includes(extension)) {
        return true;
    }

    return false;
}

// 샘플 데이터 로드 (fallback)
function loadSampleData() {
    fixedExtensions = { 'exe': true, 'bat': false };
    updateFixedExtensionsDisplay(fixedExtensions);

    customExtensions = ['sh', 'ju', 'ch'];
    updateCustomExtensionsDisplay(customExtensions);
}

// 알림 표시
function showAlert(message, type = 'info') {
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
}

// 로딩 상태 표시
function showLoadingState() {
    $('#add-extension-btn').prop('disabled', true).text('로딩 중...');
}

function hideLoadingState() {
    $('#add-extension-btn').prop('disabled', false).text('추가');
}

// 드래그 앤 드롭 초기화 (중복 방지)
function initializeDragAndDrop() {
    const uploadArea = $('#upload-area');

    // 기존 이벤트 제거
    uploadArea.off('dragover dragleave drop');

    uploadArea.on('dragover', e => {
        e.preventDefault();
        uploadArea.addClass('border-blue-400 bg-blue-50');
    });

    uploadArea.on('dragleave', e => {
        e.preventDefault();
        uploadArea.removeClass('border-blue-400 bg-blue-50');
    });

    uploadArea.on('drop', e => {
        e.preventDefault();
        uploadArea.removeClass('border-blue-400 bg-blue-50');

        const files = Array.from(e.originalEvent.dataTransfer.files);
        handleDroppedFiles(files);
    });
}

// ======================================
// 전역 함수 노출 (HTML onclick용)
// ======================================
window.switchUser = switchUser;
window.removeCustomExtension = removeCustomExtension;