const express = require('express');
const router = express.Router();

// API 라우트 모듈들
const policyRoutes = require('./policy.route');
const uploadRoutes = require('./upload.route');
const authRoutes = require('./auth.route');

console.log('📡 API 라우트 인덱스 로드 완료 (인증 시스템 통합)');

// Health Check (API 전용)
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: '파일 확장자 차단 시스템 API (인증 통합)',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        features: {
            authentication: 'Session-based',
            database: 'PostgreSQL',
            storage: 'AWS S3',
            security: 'Multi-layer (L1-L7)'
        },
        endpoints: {
            auth: '/api/auth',
            policy: '/api/policy',
            upload: '/api/upload',
            health: '/api/health'
        },
        authInfo: {
            loginRequired: true,
            loginPage: '/login.html',
            sessionBased: true,
            cookieName: 'session_id'
        }
    });
});

// 인증 관련 API (공개 라우트 포함)
router.use('/auth', authRoutes);

// 보호된 API 라우트들 (인증 필요)

// 정책 관리 API (인증 미들웨어가 각 라우트에 적용됨)
router.use('/policy', policyRoutes);

// 파일 업로드 API (기존 구현됨)
router.use('/upload', uploadRoutes);

// ===========================================
// 개발용 디버그 라우트
// ===========================================
if (process.env.NODE_ENV === 'development') {
    // API 라우트 목록 (개발용)
    router.get('/routes', (req, res) => {
        res.json({
            message: 'API 라우트 목록 (개발 모드 전용)',
            publicRoutes: [
                'GET /api/health',
                'GET /api/routes (개발 모드)',
                'POST /api/auth/login',
                'POST /api/auth/register',
                'GET /api/auth/test',
                'GET /api/upload/test',
                'GET /api/upload/allowed-types'
            ],
            protectedRoutes: [
                'GET /api/auth/verify',
                'GET /api/auth/me',
                'POST /api/auth/logout',
                'DELETE /api/auth/account',
                'GET /api/auth/sessions',
                'DELETE /api/auth/sessions/:sessionId',
                'GET /api/policy/:userId',
                'PUT /api/policy/fixed/:userId',
                'POST /api/policy/custom/:userId',
                'DELETE /api/policy/custom/:userId/:extension',
                'GET /api/policy/:userId/blocked',
                'POST /api/upload/:userId/single',
                'POST /api/upload/:userId/multiple'
            ],
            adminRoutes: [
                'GET /api/policy/admin/all',
                'GET /api/policy/admin/statistics'
            ]
        });
    });

    // 세션 디버그 정보 (개발용)
    router.get('/debug/sessions', (req, res) => {
        const sessionCleanupScheduler = require('../../services/session-cleanup.scheduler');

        res.json({
            message: '세션 시스템 디버그 정보 (개발 모드 전용)',
            scheduler: sessionCleanupScheduler.getStatus(),
            currentTime: new Date().toISOString(),
            environment: process.env.NODE_ENV
        });
    });
}

module.exports = router;