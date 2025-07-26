const uploadService = require('../services/upload.service');

class UploadController {
    // 단일 파일 업로드
    async uploadSingleFile(req, res) {
        try {
            const userId = req.params.userId || req.body.userId;
            const file = req.file;

            if (!file) {
                return res.status(400).json({
                    success: false,
                    error: '업로드할 파일이 없습니다.'
                });
            }

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: '사용자 ID가 필요합니다.'
                });
            }

            console.log('📤 단일 파일 업로드 요청:', {
                userId,
                filename: file.originalname,
                size: file.size,
                mimetype: file.mimetype
            });

            const result = await uploadService.processFileUpload(userId, file);

            if (result.success) {
                res.status(200).json(result);
            } else {
                res.status(400).json(result);
            }

        } catch (error) {
            console.error('❌ 파일 업로드 Controller 오류:', error);
            res.status(500).json({
                success: false,
                error: '파일 업로드 중 서버 오류가 발생했습니다.',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // 다중 파일 업로드
    async uploadMultipleFiles(req, res) {
        try {
            const userId = req.params.userId || req.body.userId;
            const files = req.files;

            if (!files || files.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: '업로드할 파일이 없습니다.'
                });
            }

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: '사용자 ID가 필요합니다.'
                });
            }

            console.log('📤 다중 파일 업로드 요청:', {
                userId,
                fileCount: files.length,
                filenames: files.map(f => f.originalname)
            });

            const result = await uploadService.processMultipleFiles(userId, files);

            res.status(200).json({
                success: true,
                message: `${result.summary.total}개 파일 처리 완료 (성공: ${result.summary.success}, 실패: ${result.summary.failed})`,
                data: result
            });

        } catch (error) {
            console.error('❌ 다중 파일 업로드 Controller 오류:', error);
            res.status(500).json({
                success: false,
                error: '파일 업로드 중 서버 오류가 발생했습니다.',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // 업로드 가능한 파일 타입 조회
    async getAllowedFileTypes(req, res) {
        try {
            const result = await uploadService.getAllowedFileTypes();

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('❌ 허용 파일 타입 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: '파일 타입 조회 중 오류가 발생했습니다.'
            });
        }
    }

    // 업로드 테스트 (개발용)
    async testUpload(req, res) {
        res.json({
            success: true,
            message: '파일 업로드 API가 정상 작동합니다.',
            timestamp: new Date().toISOString(),
            endpoints: {
                single: 'POST /api/upload/:userId/single',
                multiple: 'POST /api/upload/:userId/multiple',
                allowedTypes: 'GET /api/upload/allowed-types'
            }
        });
    }
}

module.exports = new UploadController();