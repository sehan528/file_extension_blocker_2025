const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../../controllers/upload.controller');

console.log('📤 Upload API routes 로드 완료');

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

// 테스트 라우트
router.get('/test', (req, res) => {
    res.json({
        message: 'Upload API 라우트가 정상 작동합니다!',
        timestamp: new Date().toISOString(),
        routes: [
            'POST /api/upload/:userId/single',
            'POST /api/upload/:userId/multiple',
            'GET /api/upload/allowed-types'
        ]
    });
});

// 단일 파일 업로드 POST /api/upload/:userId/single
router.post('/:userId/single', upload.single('file'), uploadController.uploadSingleFile);

// 다중 파일 업로드 POST /api/upload/:userId/multiple
router.post('/:userId/multiple', upload.array('files', 5), uploadController.uploadMultipleFiles);

// 허용 파일 타입 조회 GET /api/upload/allowed-types
router.get('/allowed-types', uploadController.getAllowedFileTypes);

module.exports = router;