const validationService = require('./validation.service');
const policyService = require('./policy.service');
const uploadRepository = require('../repositories/upload.repository');
const fs = require('fs').promises;
const path = require('path');

class UploadService {
    // 업로드 임시 디렉토리
    uploadDir = path.join(__dirname, '../../uploads');

    constructor() {
        this.ensureUploadDir();
    }

    // 사용자 ID를 고객 ID로 매핑
    async getUserId(userId) {
        try {
            const customerRepository = require('../repositories/customer.repository');
            const customer = await customerRepository.findByUserId(userId);

            if (!customer) {
                throw new Error(`사용자를 찾을 수 없습니다: ${userId}`);
            }

            console.log('🔄 업로드 서비스 사용자 매핑:', { userId, customerId: customer.id });
            return customer.id;

        } catch (error) {
            console.error('❌ 업로드 서비스 사용자 ID 매핑 실패:', error);
            throw error;
        }
    }

    // 업로드 디렉토리 확인/생성
    async ensureUploadDir() {
        try {
            await fs.access(this.uploadDir);
        } catch {
            await fs.mkdir(this.uploadDir, { recursive: true });
            console.log('📁 업로드 디렉토리 생성:', this.uploadDir);
        }
    }

    // 메인 파일 업로드 처리 (L1~L4 통합)
    async processFileUpload(userId, file) {
        const customerId = await this.getUserId(userId); // policyService 대신 자체 메서드 사용

        console.log('🚀 파일 업로드 처리 시작:', {
            userId,
            customerId,
            filename: file.originalname,
            size: file.size
        });

        // customerId 유효성 검사 추가
        if (!customerId) {
            console.error('❌ customerId 변환 실패:', { userId, customerId });
            return this.createValidationResult(false, {
                reason: 'INVALID_USER_ID',
                detail: '유효하지 않은 사용자 ID입니다.',
                layer: 'L1_USER_VALIDATION'
            });
        }

        let tempFilePath = null;

        try {
            // L2: 기본 파일 검증
            const basicValidation = validationService.validateBasicFile(file);
            if (!basicValidation.valid) {
                return this.createValidationResult(false, basicValidation);
            }

            // 임시 파일 저장
            tempFilePath = await this.saveTempFile(file);
            const fileExtension = validationService.extractFileExtension(file.originalname);

            // L3: 정책 기반 시그니처 검증
            const signatureValidation = await validationService.validateFileSignature(tempFilePath, fileExtension, customerId);
            if (!signatureValidation.valid) {
                return this.createValidationResult(false, signatureValidation);
            }

            // 경고가 있는 경우 로그 기록
            if (signatureValidation.warning) {
                console.log(`⚠️ 파일 검증 경고: ${signatureValidation.warning}`);
            }

            // L4: 정책 기반 검증
            const policyValidation = await this.validateAgainstPolicy(customerId, fileExtension);
            if (!policyValidation.valid) {
                return this.createValidationResult(false, policyValidation);
            }

            // 모든 검증 통과 - 업로드 이력 저장
            const uploadHistory = await uploadRepository.saveUploadHistory({
                customerId: customerId,
                originalFilename: file.originalname,
                fileExtension: fileExtension,
                fileSize: file.size,
                s3Bucket: null, // S3 나중에 연동
                s3Key: null
            });

            console.log('✅ 파일 업로드 성공:', uploadHistory.id);

            return this.createValidationResult(true, {
                uploadId: uploadHistory.id,
                filename: file.originalname,
                extension: fileExtension,
                size: file.size,
                layers: [
                    basicValidation.layer,
                    signatureValidation.layer,
                    policyValidation.layer
                ]
            });

        } catch (error) {
            console.error('❌ 파일 업로드 처리 오류:', error);
            return this.createValidationResult(false, {
                reason: 'UPLOAD_ERROR',
                detail: `업로드 처리 중 오류: ${error.message}`,
                layer: 'L5_UPLOAD'
            });

        } finally {
            // 임시 파일 정리
            if (tempFilePath) {
                await this.cleanupTempFile(tempFilePath);
            }
        }
    }

    // L4: 정책 기반 검증
    async validateAgainstPolicy(customerId, fileExtension) {
        try {
            // customerId로 직접 userid 역변환
            const customerRepository = require('../repositories/customer.repository');
            const customer = await customerRepository.findById(customerId);

            if (!customer) {
                throw new Error(`고객을 찾을 수 없습니다: ${customerId}`);
            }

            const userId = customer.userid;

            console.log('🔍 정책 검증 시작:', { customerId, userId, fileExtension });

            // 차단된 확장자 목록만 조회
            const policyService = require('./policy.service');
            const blockedExtensions = await policyService.getBlockedExtensions(userId);

            console.log('🔍 블랙리스트 모드 정책 검증:', {
                fileExtension,
                blockedExtensions: blockedExtensions.slice(0, 10), // 처음 10개만 로그
                totalBlocked: blockedExtensions.length
            });

            // 블랙리스트에 있으면 차단, 없으면 허용!
            if (blockedExtensions.includes(fileExtension)) {
                console.log(`❌ 파일 차단: ${fileExtension} (블랙리스트에 포함)`);
                return {
                    valid: false,
                    reason: 'BLOCKED_BY_POLICY',
                    detail: `정책에 의해 차단된 확장자입니다: ${fileExtension}`,
                    layer: 'L4_POLICY'
                };
            }

            console.log(`✅ 파일 허용: ${fileExtension} (블랙리스트에 없음)`);
            return {
                valid: true,
                layer: 'L4_POLICY',
                note: `${fileExtension} 확장자는 정책상 허용됩니다.`
            };

        } catch (error) {
            console.error('❌ 정책 검증 오류:', error);
            return {
                valid: false,
                reason: 'POLICY_CHECK_ERROR',
                detail: `정책 확인 중 오류: ${error.message}`,
                layer: 'L4_POLICY'
            };
        }
    }

    // 임시 파일 저장
    async saveTempFile(file) {
        const tempFilename = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.tmp`;
        const tempFilePath = path.join(this.uploadDir, tempFilename);

        await fs.writeFile(tempFilePath, file.buffer);
        console.log('💾 임시 파일 저장:', tempFilePath);

        return tempFilePath;
    }

    // 임시 파일 정리
    async cleanupTempFile(filePath) {
        try {
            await fs.unlink(filePath);
            console.log('🗑️ 임시 파일 정리:', filePath);
        } catch (error) {
            console.warn('⚠️ 임시 파일 정리 실패:', error.message);
        }
    }

    // 검증 결과 생성
    createValidationResult(success, data) {
        if (success) {
            return {
                success: true,
                message: '파일이 성공적으로 업로드되었습니다.',
                data: data
            };
        } else {
            return {
                success: false,
                error: data.detail || data.reason || '파일 업로드에 실패했습니다.',
                reason: data.reason,
                layer: data.layer,
                details: process.env.NODE_ENV === 'development' ? data : undefined
            };
        }
    }

    // 여러 파일 업로드 처리
    async processMultipleFiles(userId, files) {
        const results = [];

        for (const file of files) {
            const result = await this.processFileUpload(userId, file);
            results.push({
                filename: file.originalname,
                ...result
            });
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;

        return {
            summary: {
                total: results.length,
                success: successCount,
                failed: failCount
            },
            results: results
        };
    }

    // 업로드 가능한 파일 타입 조회
    async getAllowedFileTypes() {
        return {
            allowedExtensions: [
                'jpg', 'jpeg', 'png', 'gif', 'webp',
                'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
                'txt', 'csv', 'json', 'xml',
                'zip', 'rar', '7z',
                'mp3', 'mp4', 'avi', 'mov'
            ],
            maxFileSize: '10MB',
            note: '정책에 따라 일부 확장자는 차단될 수 있습니다.'
        };
    }
}

module.exports = new UploadService();