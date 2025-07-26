const policyService = require('../services/policy.service');

class PolicyController {
    // 정책 조회
    async getPolicies(req, res) {
        try {
            const { userId } = req.params;
            console.log('📋 정책 조회 요청:', userId);

            const result = await policyService.getUserPolicies(userId);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('❌ 정책 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: '정책을 조회하는 중 오류가 발생했습니다.',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // 고정 확장자 토글
    async updateFixedExtension(req, res) {
        try {
            const { userId } = req.params;
            const { extension, isBlocked } = req.body;

            // 입력 검증
            const validation = policyService.validateFixedExtensionInput(extension, isBlocked);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: validation.error
                });
            }

            const result = await policyService.updateFixedExtension(userId, extension, isBlocked);

            res.json({
                success: true,
                message: `${extension} 확장자가 ${isBlocked ? '차단' : '허용'} 되었습니다.`,
                data: result
            });

        } catch (error) {
            console.error('❌ 고정 확장자 업데이트 오류:', error);
            res.status(500).json({
                success: false,
                error: '확장자 정책을 업데이트하는 중 오류가 발생했습니다.'
            });
        }
    }

    // 커스텀 확장자 추가
    async addCustomExtension(req, res) {
        try {
            const { userId } = req.params;
            const { extension } = req.body;

            // 입력 검증
            const validation = await policyService.validateCustomExtensionInput(userId, extension);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: validation.error
                });
            }

            const result = await policyService.addCustomExtension(userId, validation.cleanExtension);

            res.json({
                success: true,
                message: `${validation.cleanExtension} 확장자가 추가되었습니다.`,
                data: result
            });

        } catch (error) {
            console.error('❌ 커스텀 확장자 추가 오류:', error);
            res.status(500).json({
                success: false,
                error: '확장자를 추가하는 중 오류가 발생했습니다.'
            });
        }
    }

    // 커스텀 확장자 삭제
    async deleteCustomExtension(req, res) {
        try {
            const { userId, extension } = req.params;

            const result = await policyService.deleteCustomExtension(userId, extension);

            if (!result.success) {
                return res.status(404).json({
                    success: false,
                    error: '해당 커스텀 확장자를 찾을 수 없습니다.'
                });
            }

            res.json({
                success: true,
                message: `${extension} 확장자가 제거되었습니다.`,
                data: result.data
            });

        } catch (error) {
            console.error('❌ 커스텀 확장자 삭제 오류:', error);
            res.status(500).json({
                success: false,
                error: '확장자를 삭제하는 중 오류가 발생했습니다.'
            });
        }
    }

    // 차단된 확장자 목록 조회
    async getBlockedExtensions(req, res) {
        try {
            const { userId } = req.params;

            const blockedExtensions = await policyService.getBlockedExtensions(userId);

            res.json({
                success: true,
                data: {
                    blockedExtensions: blockedExtensions
                }
            });

        } catch (error) {
            console.error('❌ 차단 확장자 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: '차단된 확장자 목록을 조회하는 중 오류가 발생했습니다.'
            });
        }
    }
}

module.exports = new PolicyController();