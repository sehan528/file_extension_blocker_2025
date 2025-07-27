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
        return await this.request(`${this.baseUrl}/policy/custom/${userId}`, {
            method: 'POST',
            body: JSON.stringify({
                extension: extension
            })
        });
    }

    // 커스텀 확장자 삭제 메서드
    async deleteCustomExtension(userId, extension) {
        return await this.request(`${this.baseUrl}/policy/custom/${userId}/${extension}`, {
            method: 'DELETE'
        });
    }

    async getBlockedExtensions(userId) {
        return await this.request(`${this.baseUrl}/policy/${userId}/blocked`);
    }

    // 파일 업로드 API
    async uploadSingleFile(userId, file) {
        const formData = new FormData();
        formData.append('file', file);

        return await this.request(`${this.baseUrl}/upload/${userId}/single`, {
            method: 'POST',
            headers: {}, // Content-Type을 자동으로 설정하게 함 (multipart/form-data)
            body: formData
        });
    }

    // Health Check
    async healthCheck() {
        return await this.request(`${this.baseUrl}/health`);
    }
}

// 전역 API 클라이언트 인스턴스
window.apiClient = new ApiClient();