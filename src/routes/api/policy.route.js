const express = require('express');
const router = express.Router();
const policyController = require('../../controllers/policy.controller');
const authMiddleware = require('../../middleware/auth.middleware');

console.log('📋 Policy API routes 로드 완료 (인증 적용)');

// 테스트 라우트
router.get('/test', (req, res) => {
    res.json({
        message: 'Policy API 라우트가 정상 작동합니다! (인증 적용)',
        timestamp: new Date().toISOString(),
        routes: [
            'GET /api/policy/:userId (인증 필요)',
            'PUT /api/policy/fixed/:userId (인증 필요)',
            'POST /api/policy/custom/:userId (인증 필요)',
            'DELETE /api/policy/custom/:userId/:extension (인증 필요)',
            'GET /api/policy/:userId/blocked (인증 필요)'
        ]
    });
});

// 인증이 필요한 라우트들

// 정책 조회 GET /api/policy/:userId
router.get('/:userId',
    authMiddleware.authenticateSession,
    authMiddleware.extendSessionIfNeeded,
    authMiddleware.requireSelfOrAdmin,
    policyController.getPolicies
);

// 고정 확장자 토글 PUT /api/policy/fixed/:userId
router.put('/fixed/:userId',
    authMiddleware.authenticateSession,
    authMiddleware.extendSessionIfNeeded,
    authMiddleware.requireSelfOrAdmin,
    policyController.updateFixedExtension
);

// 커스텀 확장자 추가 POST /api/policy/custom/:userId
router.post('/custom/:userId',
    authMiddleware.authenticateSession,
    authMiddleware.extendSessionIfNeeded,
    authMiddleware.requireSelfOrAdmin,
    policyController.addCustomExtension
);

// 커스텀 확장자 삭제 DELETE /api/policy/custom/:userId/:extension
router.delete('/custom/:userId/:extension',
    authMiddleware.authenticateSession,
    authMiddleware.extendSessionIfNeeded,
    authMiddleware.requireSelfOrAdmin,
    policyController.deleteCustomExtension
);

// 차단된 확장자 목록 조회 GET /api/policy/:userId/blocked
router.get('/:userId/blocked',
    authMiddleware.authenticateSession,
    authMiddleware.extendSessionIfNeeded,
    authMiddleware.requireSelfOrAdmin,
    policyController.getBlockedExtensions
);

module.exports = router;