const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../../controllers/upload.controller');
const authMiddleware = require('../../middleware/auth.middleware');

console.log('📤 Upload API routes 로드 완료 (인증 적용)');

// Multer 설정 (메모리 저장)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB 제한
        files: 5 // 최대 5개 파일
    },
    fileFilter: (req, file, cb) => {
        // 기본적인 파일 필터링 (추후 확장 가능)
        console.log('📁 파일 필터 검사:', {
            originalname: file.originalname,
            mimetype: file.mimetype
        });

        // 모든 파일 허용 (상세 검증은 ValidationService에서 처리)
        cb(null, true);
    }
});

// 공개 라우트

// 테스트 라우트
router.get('/test', (req, res) => {
    res.json({
        message: 'Upload API 라우트가 정상 작동합니다! (인증 적용)',
        timestamp: new Date().toISOString(),
        routes: [
            'POST /api/upload/:userId/single (인증 필요)',
            'POST /api/upload/:userId/multiple (인증 필요)',
            'GET /api/upload/allowed-types'
        ]
    });
});

// 허용 파일 타입 조회 GET /api/upload/allowed-types (공개)
router.get('/allowed-types', uploadController.getAllowedFileTypes);

// ===========================================
// 인증이 필요한 라우트들
// ===========================================

// 단일 파일 업로드 POST /api/upload/:userId/single
router.post('/:userId/single',
    authMiddleware.authenticateSession,
    authMiddleware.extendSessionIfNeeded,
    authMiddleware.requireSelfOrAdmin,
    upload.single('file'),
    uploadController.uploadSingleFile
);

// 다중 파일 업로드 POST /api/upload/:userId/multiple
router.post('/:userId/multiple',
    authMiddleware.authenticateSession,
    authMiddleware.extendSessionIfNeeded,
    authMiddleware.requireSelfOrAdmin,
    upload.array('files', 5),
    uploadController.uploadMultipleFiles
);

module.exports = router;