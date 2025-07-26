const policyRepository = require('../repositories/policy.repository');

class PolicyService {
    // 사용자 ID를 고객 ID로 매핑 (임시)
    getUserId(userId) {
        return userId === 'demo1' ? 1 : userId === 'demo2' ? 2 : 1;
    }

    // 사용자 정책 조회
    async getUserPolicies(userId) {
        const customerId = this.getUserId(userId);

        try {
            const [fixedExtensions, customExtensions] = await Promise.all([
                policyRepository.getFixedExtensionPolicies(customerId),
                policyRepository.getCustomExtensionPolicies(customerId)
            ]);

            console.log('✅ DB 조회 성공:', {
                fixedCount: fixedExtensions.length,
                customCount: customExtensions.length
            });

            return {
                userId: userId,
                customerId: customerId,
                fixedExtensions: fixedExtensions.reduce((acc, item) => {
                    acc[item.extension_name] = item.is_blocked;
                    return acc;
                }, {}),
                customExtensions: customExtensions.map(item => item.extension_name),
                customExtensionCount: customExtensions.length
            };

        } catch (error) {
            console.warn('⚠️ DB 연결 실패, 샘플 데이터 반환:', error.message);

            // DB 연결 실패 시 샘플 데이터 반환
            return {
                userId: userId,
                customerId: customerId,
                fixedExtensions: {
                    'bat': false,
                    'cmd': false,
                    'com': false,
                    'cpl': false,
                    'exe': true,  // 샘플로 exe만 체크된 상태
                    'scr': false,
                    'js': false
                },
                customExtensions: ['sh', 'ju', 'ch'], // 샘플 커스텀 확장자
                customExtensionCount: 3,
                note: 'DB 연결 실패로 샘플 데이터를 반환합니다.'
            };
        }
    }

    // 고정 확장자 입력 검증
    validateFixedExtensionInput(extension, isBlocked) {
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

    // 고정 확장자 업데이트
    async updateFixedExtension(userId, extension, isBlocked) {
        const customerId = this.getUserId(userId);

        const result = await policyRepository.updateFixedExtension(customerId, extension, isBlocked);

        if (!result) {
            throw new Error('해당 확장자 정책을 찾을 수 없습니다.');
        }

        return {
            extension: extension,
            isBlocked: isBlocked,
            updatedAt: result.updated_at
        };
    }

    // 커스텀 확장자 입력 검증
    async validateCustomExtensionInput(userId, extension) {
        if (!extension || typeof extension !== 'string') {
            return {
                isValid: false,
                error: '확장자명을 입력해주세요.'
            };
        }

        const cleanExtension = extension.trim().toLowerCase();

        if (cleanExtension.length === 0) {
            return {
                isValid: false,
                error: '확장자명을 입력해주세요.'
            };
        }

        if (cleanExtension.length > 20) {
            return {
                isValid: false,
                error: '확장자명은 20자를 초과할 수 없습니다.'
            };
        }

        if (!/^[a-z0-9]+$/.test(cleanExtension)) {
            return {
                isValid: false,
                error: '확장자명은 영문과 숫자만 입력 가능합니다.'
            };
        }

        // 고정 확장자 중복 체크
        const fixedExtensions = ['bat', 'cmd', 'com', 'cpl', 'exe', 'scr', 'js'];
        if (fixedExtensions.includes(cleanExtension)) {
            return {
                isValid: false,
                error: `${cleanExtension}은 고정 확장자입니다. 위의 체크박스를 사용해주세요.`
            };
        }

        const customerId = this.getUserId(userId);

        // 기존 확장자 중복 체크
        const exists = await policyRepository.checkExtensionExists(customerId, cleanExtension);
        if (exists) {
            return {
                isValid: false,
                error: `${cleanExtension} 확장자는 이미 추가되어 있습니다.`
            };
        }

        // 커스텀 확장자 개수 제한 체크
        const currentCount = await policyRepository.getCustomExtensionCount(customerId);
        if (currentCount >= 200) {
            return {
                isValid: false,
                error: '커스텀 확장자는 최대 200개까지 추가할 수 있습니다.'
            };
        }

        return {
            isValid: true,
            cleanExtension: cleanExtension,
            currentCount: currentCount
        };
    }

    // 커스텀 확장자 추가
    async addCustomExtension(userId, cleanExtension) {
        const customerId = this.getUserId(userId);
        const currentCount = await policyRepository.getCustomExtensionCount(customerId);

        const result = await policyRepository.addCustomExtension(customerId, cleanExtension);

        return {
            extension: cleanExtension,
            customExtensionCount: currentCount + 1,
            createdAt: result.created_at
        };
    }

    // 커스텀 확장자 삭제
    async deleteCustomExtension(userId, extension) {
        const customerId = this.getUserId(userId);

        const result = await policyRepository.deleteCustomExtension(customerId, extension);

        if (!result) {
            return { success: false };
        }

        const currentCount = await policyRepository.getCustomExtensionCount(customerId);

        return {
            success: true,
            data: {
                extension: extension,
                customExtensionCount: currentCount
            }
        };
    }

    // 차단된 확장자 목록 조회
    async getBlockedExtensions(userId) {
        const customerId = this.getUserId(userId);
        return await policyRepository.getBlockedExtensions(customerId);
    }
}

module.exports = new PolicyService();