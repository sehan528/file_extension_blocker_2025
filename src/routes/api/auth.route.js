const express = require('express');
const router = express.Router();
const authController = require('../../controllers/auth.controller');
const authMiddleware = require('../../middleware/auth.middleware');

console.log('🔐 Auth API routes 로드 완료');

// 테스트 라우트
router.get('/test', (req, res) => {
    res.json({
        message: 'Auth API 라우트가 정상 작동합니다!',
        timestamp: new Date().toISOString(),
        routes: [
            'POST /api/auth/login',
            'POST /api/auth/register',
            'POST /api/auth/logout',
            'GET /api/auth/me',
            'POST /api/auth/change-password',
            'GET /api/auth/verify',
            'DELETE /api/auth/account',
            'GET /api/auth/sessions',
            'DELETE /api/auth/sessions/:sessionId'
        ]
    });
});

// 공개 라우트 (인증 불필요)
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/logout', authController.logout);

// 보호된 라우트 (세션 인증 필요)
router.get('/me',
    authMiddleware.authenticateSession,
    authMiddleware.extendSessionIfNeeded,
    authController.getCurrentUser
);

router.post('/change-password',
    authMiddleware.authenticateSession,
    authController.changePassword
);

router.get('/verify',
    authMiddleware.authenticateSession,
    authController.verifySession
);

router.delete('/account',
    authMiddleware.authenticateSession,
    authController.deleteAccount
);

// 세션 관리 라우트
router.get('/sessions',
    authMiddleware.authenticateSession,
    authController.getActiveSessions
);

router.delete('/sessions/:sessionId',
    authMiddleware.authenticateSession,
    authController.deleteSession
);

module.exports = router;