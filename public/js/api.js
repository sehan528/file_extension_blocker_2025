class ApiClient {
    constructor() {
        this.baseUrl = '/api';
    }

    // 공통 API 호출 메서드
    async request(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, finalOptions);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return data;
        } catch (error) {
            console.error('API 요청 실패:', error);
            throw error;
        }
    }

    // FormData 전용 요청 메서드 (파일 업로드용)
    async requestFormData(url, formData) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData
                // Content-Type 헤더는 자동으로 설정됨 (multipart/form-data)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return data;
        } catch (error) {
            console.error('파일 업로드 API 요청 실패:', error);
            throw error;
        }
    }

    // 정책 관련 API
    async getPolicies(userId) {
        return await this.request(`${this.baseUrl}/policy/${userId}`);
    }

    async updateFixedExtension(userId, extension, isBlocked) {
        return await this.request(`${this.baseUrl}/policy/fixed/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({
                extension: extension,
                isBlocked: isBlocked
            })
        });
    }

    async addCustomExtension(userId, extension) {
        try {
            return await this.request(`${this.baseUrl}/policy/custom/${userId}`, {
                method: 'POST',
                body: JSON.stringify({
                    extension: extension
                })
            });
        } catch (error) {
            // 409 Conflict 에러의 경우 상세 정보 포함
            if (error.message.includes('409')) {
                const response = await fetch(`${this.baseUrl}/policy/custom/${userId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ extension: extension })
                });

                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            throw error;
        }
    }

    async deleteCustomExtension(userId, extension) {
        return await this.request(`${this.baseUrl}/policy/custom/${userId}/${extension}`, {
            method: 'DELETE'
        });
    }

    async getBlockedExtensions(userId) {
        return await this.request(`${this.baseUrl}/policy/${userId}/blocked`);
    }

    // 파일 업로드 관련 API (새로 추가)
    async uploadSingleFile(userId, file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', userId);

        return await this.requestFormData(`${this.baseUrl}/upload/${userId}/single`, formData);
    }

    async uploadMultipleFiles(userId, files) {
        const formData = new FormData();

        // 여러 파일을 'files' 필드로 추가
        for (let file of files) {
            formData.append('files', file);
        }
        formData.append('userId', userId);

        return await this.requestFormData(`${this.baseUrl}/upload/${userId}/multiple`, formData);
    }

    async getAllowedFileTypes() {
        return await this.request(`${this.baseUrl}/upload/allowed-types`);
    }

    // Health Check
    async healthCheck() {
        return await this.request(`${this.baseUrl}/health`);
    }

    // 업로드 테스트
    async testUpload() {
        return await this.request(`${this.baseUrl}/upload/test`);
    }
}

// 전역 API 클라이언트 인스턴스
window.apiClient = new ApiClient();