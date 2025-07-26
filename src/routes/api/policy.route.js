const express = require('express');
const router = express.Router();
const policyController = require('../../controllers/policy.controller');

console.log('📋 Policy API routes 로드 완료');

// 테스트 라우트
router.get('/test', (req, res) => {
    res.json({
        message: 'Policy API 라우트가 정상 작동합니다!',
        timestamp: new Date().toISOString(),
        routes: [
            'GET /api/policy/:userId',
            'PUT /api/policy/fixed/:userId',
            'POST /api/policy/custom/:userId',
            'DELETE /api/policy/custom/:userId/:extension',
            'GET /api/policy/:userId/blocked'
        ]
    });
});

// 정책 조회 GET /api/policy/:userId
router.get('/:userId', policyController.getPolicies);

// 고정 확장자 토글 PUT /api/policy/fixed/:userId
router.put('/fixed/:userId', policyController.updateFixedExtension);

// 커스텀 확장자 추가 POST /api/policy/custom/:userId
router.post('/custom/:userId', policyController.addCustomExtension);

// 커스텀 확장자 삭제 DELETE /api/policy/custom/:userId/:extension
router.delete('/custom/:userId/:extension', policyController.deleteCustomExtension);

// 차단된 확장자 목록 조회 GET /api/policy/:userId/blocked
router.get('/:userId/blocked', policyController.getBlockedExtensions);

module.exports = router;