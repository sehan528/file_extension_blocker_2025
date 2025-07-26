const express = require('express');
const multer = require('multer');
const router = express.Router();
const uploadController = require('../../controllers/upload.controller');

console.log('📤 Upload API routes 로드 완료');

// Multer 설정 (메모리 저장)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 5 // 최대 5개 파일
    },
    fileFilter: (req, file, cb) => {
        // 기본적인 MIME 타입 체크 (추가 검증은 Service에서)
        console.log('📁 파일 수신:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size
        });

        // 모든 파일 허용 (Service Layer에서 상세 검증)
        cb(null, true);
    }
});

// 에러 처리 미들웨어
const handleMulterError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    success: false,
                    error: '파일 크기가 너무 큽니다. 최대 10MB까지 허용됩니다.',
                    code: 'FILE_TOO_LARGE'
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    success: false,
                    error: '파일 개수가 너무 많습니다. 최대 5개까지 허용됩니다.',
                    code: 'TOO_MANY_FILES'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    success: false,
                    error: '예상하지 못한 파일 필드입니다.',
                    code: 'UNEXPECTED_FILE'
                });
            default:
                return res.status(400).json({
                    success: false,
                    error: `파일 업로드 오류: ${error.message}`,
                    code: 'UPLOAD_ERROR'
                });
        }
    }
    next(error);
};

// 테스트 라우트
router.get('/test', uploadController.testUpload);

// 업로드 가능한 파일 타입 조회
router.get('/allowed-types', uploadController.getAllowedFileTypes);

// 단일 파일 업로드
router.post('/:userId/single',
    upload.single('file'),
    handleMulterError,
    uploadController.uploadSingleFile
);

// 다중 파일 업로드
router.post('/:userId/multiple',
    upload.array('files', 5),
    handleMulterError,
    uploadController.uploadMultipleFiles
);

module.exports = router;