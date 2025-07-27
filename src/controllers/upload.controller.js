const uploadService = require('../services/upload.service');

class UploadController {
    // 단일 파일 업로드
    async uploadSingleFile(req, res) {
        try {
            const { userId } = req.params;
            const file = req.file;

            console.log('📁 파일 수신:', {
                originalname: file?.originalname,
                mimetype: file?.mimetype,
                size: file?.size
            });

            if (!file) {
                return res.status(400).json({
                    success: false,
                    error: '파일이 업로드되지 않았습니다.'
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
                res.json({
                    success: true,
                    message: result.message,
                    data: result.data
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error,
                    reason: result.reason,
                    layer: result.layer
                });
            }

        } catch (error) {
            console.error('❌ 파일 업로드 컨트롤러 오류:', error);
            res.status(500).json({
                success: false,
                error: '파일 업로드 처리 중 서버 오류가 발생했습니다.',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // 여러 파일 업로드
    async uploadMultipleFiles(req, res) {
        try {
            const { userId } = req.params;
            const files = req.files;

            if (!files || files.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: '파일이 업로드되지 않았습니다.'
                });
            }

            console.log('📤 다중 파일 업로드 요청:', {
                userId,
                fileCount: files.length,
                filenames: files.map(f => f.originalname)
            });

            const result = await uploadService.processMultipleFiles(userId, files);

            res.json({
                success: true,
                message: `${result.summary.total}개 파일 중 ${result.summary.success}개 성공, ${result.summary.failed}개 실패`,
                data: {
                    summary: result.summary,
                    results: result.results
                }
            });

        } catch (error) {
            console.error('❌ 다중 파일 업로드 컨트롤러 오류:', error);
            res.status(500).json({
                success: false,
                error: '파일 업로드 처리 중 서버 오류가 발생했습니다.'
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
                error: '허용 파일 타입을 조회하는 중 오류가 발생했습니다.'
            });
        }
    }
}

module.exports = new UploadController();