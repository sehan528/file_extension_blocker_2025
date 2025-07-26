const express = require('express');
const router = express.Router();

// API 라우트 모듈들
const policyRoutes = require('./policy.route');

// Health Check (API 전용)
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: '파일 확장자 차단 시스템 API',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
            policy: '/api/policy',
            health: '/api/health'
        }
    });
});

// 정책 관리 API
router.use('/policy', policyRoutes);

// TODO: 추가 API 라우트들
// router.use('/upload', uploadRoutes);
// router.use('/auth', authRoutes);

module.exports = router;