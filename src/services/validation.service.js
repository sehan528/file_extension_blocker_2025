const { fileTypeFromBuffer } = require('file-type');
const fs = require('fs').promises;
const path = require('path');

class ValidationService {
    // 시그니처와 확장자 매핑 테이블
    // L2 = 웹 어플리케이션
    // L3 = 파일 검증 케이스
    signatureToExtensionMap = [
        // 시작 시그니쳐, 탐색 시작 위치 (0 = 0번째 위치 부터 시작), 확장자, 설명, 카테고리
        {
            signature: [0x4D, 0x5A],
            offset: 0,
            extensions: ['exe', 'dll', 'sys'],
            description: 'PE Executable (Windows)',
            category: 'executable'
        },
        {
            signature: [0x7F, 0x45, 0x4C, 0x46],
            offset: 0,
            extensions: ['elf', 'bin'],
            description: 'ELF Executable (Linux)',
            category: 'executable'
        },
        {
            signature: [0xFE, 0xED, 0xFA, 0xCE],
            offset: 0,
            extensions: ['macho'],
            description: 'Mach-O Executable (macOS)',
            category: 'executable'
        },
        {
            signature: [0xCA, 0xFE, 0xBA, 0xBE],
            offset: 0,
            extensions: ['class'],
            description: 'Java Class File',
            category: 'executable'
        },

        // 스크립트 파일들
        {
            signature: [0x23, 0x21], // #!/
            offset: 0,
            extensions: ['sh', 'bash', 'pl', 'py'],
            description: 'Script File with Shebang',
            category: 'script'
        },

        // 안전한 파일들
        {
            signature: [0xFF, 0xD8, 0xFF],
            offset: 0,
            extensions: ['jpg', 'jpeg'],
            description: 'JPEG Image',
            category: 'image'
        },
        {
            signature: [0x89, 0x50, 0x4E, 0x47],
            offset: 0,
            extensions: ['png'],
            description: 'PNG Image',
            category: 'image'
        },
        {
            signature: [0x25, 0x50, 0x44, 0x46],
            offset: 0,
            extensions: ['pdf'],
            description: 'PDF Document',
            category: 'document'
        },
        {
            signature: [0x50, 0x4B, 0x03, 0x04],
            offset: 0,
            extensions: ['zip', 'docx', 'xlsx', 'pptx'],
            description: 'ZIP Archive / Office Document',
            category: 'archive'
        }
    ];

    // 파일 바이너리 분석 기반 시그니처 검증
    async validateFileSignature(filePath, reportedExtension, customerId) {
        try {
            console.log(`🔍 정책 기반 파일 검증: ${path.basename(filePath)}`);
            console.log(`📋 보고된 확장자: ${reportedExtension}, 고객 ID: ${customerId}`);

            // customerId 유효성 검사 추가
            if (!customerId || customerId === 'undefined') {
                console.error('❌ customerId가 유효하지 않습니다:', customerId);
                return {
                    valid: false,
                    reason: 'INVALID_CUSTOMER_ID',
                    detail: '고객 ID가 유효하지 않습니다.',
                    layer: 'L3_SIGNATURE'
                };
            }

            const buffer = await fs.readFile(filePath);
            const headerBuffer = buffer.slice(0, 65536);

            // 1단계: 시그니처 탐지
            const detectedSignature = this.detectFileSignature(headerBuffer);

            if (!detectedSignature) {
                // 시그니처 미탐지 - file-type 라이브러리 활용
                return await this.handleUnknownSignature(headerBuffer, reportedExtension, customerId);
            }

            console.log(`🎯 탐지된 시그니처: ${detectedSignature.description}`);
            console.log(`🎯 매핑된 확장자들: ${detectedSignature.extensions.join(', ')}`);

            // 2단계: 정책 기반 검증 (DB 조회)
            const allowedExtensions = await this.getCustomerAllowedExtensions(customerId);

            // 3단계: 검증 로직 실행
            return this.validateAgainstPolicy(
                reportedExtension,
                detectedSignature,
                allowedExtensions
            );

        } catch (error) {
            console.error('❌ 파일 시그니처 검증 오류:', error);
            return {
                valid: false,
                reason: 'VALIDATION_ERROR',
                detail: `파일 검증 중 오류: ${error.message}`,
                layer: 'L3_SIGNATURE'
            };
        }
    }

    // 시그니처 탐지
    detectFileSignature(buffer) {
        for (const signatureInfo of this.signatureToExtensionMap) {
            const { signature, offset = 0 } = signatureInfo;

            if (buffer.length >= offset + signature.length) {
                let match = true;
                for (let i = 0; i < signature.length; i++) {
                    if (buffer[offset + i] !== signature[i]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    return signatureInfo;
                }
            }
        }
        return null;
    }

    // 고객의 허용된 확장자 목록 조회
    async getCustomerAllowedExtensions(customerId) {
        try {
            const policyRepository = require('../repositories/policy.repository');

            // 차단된 확장자 목록만 조회
            const blockedExtensions = await policyRepository.getAllBlockedExtensions(customerId);
            const blockedExtensionNames = blockedExtensions.map(item => item.extension_name);

            console.log(`🚫 차단된 확장자:`, blockedExtensionNames);

            // 허용 로직: 차단 목록에 없으면 모두 허용!
            return {
                isBlockListMode: true, // 블랙리스트 모드
                blockedExtensions: blockedExtensionNames
            };

        } catch (error) {
            console.error('❌ 고객 정책 조회 실패:', error);
            // 실패 시 안전한 기본값 (빈 배열 = 아무것도 차단 안함)
            return {
                isBlockListMode: true,
                blockedExtensions: []
            };
        }
    }

    // 고객 정책 기반 검증 핵심 로직
    validateAgainstPolicy(reportedExtension, detectedSignature, allowedExtensions) {
        const normalizedReported = this.normalizeExtension(reportedExtension);

        // 블랙리스트 모드인 경우
        if (allowedExtensions.isBlockListMode) {
            const blockedExtensions = allowedExtensions.blockedExtensions;

            console.log(`🔍 블랙리스트 모드 검증: ${normalizedReported}`);
            console.log(`🚫 차단 목록:`, blockedExtensions);

            // Case 1: 보고된 확장자와 시그니처가 일치하는 경우
            if (detectedSignature.extensions.includes(normalizedReported)) {
                if (blockedExtensions.includes(normalizedReported)) {
                    return {
                        valid: false,
                        reason: 'BLOCKED_BY_POLICY',
                        detail: `${normalizedReported} 확장자는 차단되었습니다. (정책상 차단된 확장자)`,
                        layer: 'L3_SIGNATURE'
                    };
                } else {
                    return {
                        valid: true,
                        detectedType: normalizedReported,
                        signatureMatch: true,
                        message: `${normalizedReported} 파일이 허용되었습니다.`,
                        layer: 'L3_SIGNATURE'
                    };
                }
            }

            // Case 2: 호환 가능한 확장자인지 체크 (예: jpg/jpeg)
            const actualExtension = detectedSignature.extensions[0];
            if (this.isCompatibleExtension(normalizedReported, actualExtension)) {
                // 보고된 확장자와 실제 확장자 중 하나라도 차단되면 차단
                if (blockedExtensions.includes(normalizedReported) || blockedExtensions.includes(actualExtension)) {
                    return {
                        valid: false,
                        reason: 'BLOCKED_BY_POLICY',
                        detail: `${normalizedReported}/${actualExtension} 확장자는 정책에서 차단되었습니다.`,
                        layer: 'L3_SIGNATURE'
                    };
                } else {
                    return {
                        valid: true,
                        detectedType: actualExtension,
                        signatureMatch: true,
                        note: `${normalizedReported}와 ${actualExtension}는 호환 가능한 확장자입니다.`,
                        layer: 'L3_SIGNATURE'
                    };
                }
            }

            // Case 3: 확장자 위조 의심 검사
            // 하지만 차단 목록에 없으면 경고만 하고 허용!
            if (blockedExtensions.includes(normalizedReported) || blockedExtensions.includes(actualExtension)) {
                return {
                    valid: false,
                    reason: 'EXTENSION_FORGERY_DETECTED',
                    detail: `보안상 위험: 파일이 .${reportedExtension}로 보고되었지만 실제로는 .${actualExtension} 파일입니다. 해당 확장자는 차단되었습니다.`,
                    detectedType: actualExtension,
                    reportedExtension: reportedExtension,
                    securityRisk: 'HIGH',
                    layer: 'L3_SIGNATURE'
                };
            } else {
                // 확장자 위조이지만 둘 다 차단 목록에 없으면 경고 후 허용
                return {
                    valid: true,
                    detectedType: actualExtension,
                    reportedExtension: reportedExtension,
                    warning: `파일 확장자 불일치: .${reportedExtension}로 보고되었지만 실제로는 .${actualExtension} 파일입니다. 보안상 주의가 필요하지만 정책상 허용됩니다.`,
                    securityRisk: 'MEDIUM',
                    layer: 'L3_SIGNATURE'
                };
            }
        }

        // 기존 화이트리스트 모드 로직 (하위 호환성)
        // Case 1: 보고된 확장자와 시그니처가 일치하는 경우
        if (detectedSignature.extensions.includes(normalizedReported)) {
            if (allowedExtensions.includes(normalizedReported)) {
                return {
                    valid: true,
                    detectedType: normalizedReported,
                    signatureMatch: true,
                    message: `${normalizedReported} 파일이 허용되었습니다.`,
                    layer: 'L3_SIGNATURE'
                };
            } else {
                return {
                    valid: false,
                    reason: 'BLOCKED_BY_POLICY',
                    detail: `${normalizedReported} 확장자는 차단되었습니다. (체크된 확장자)`,
                    layer: 'L3_SIGNATURE'
                };
            }
        }

        // Case 2: 호환 가능한 확장자인지 체크 (예: jpg/jpeg)
        const actualExtension = detectedSignature.extensions[0];
        if (this.isCompatibleExtension(normalizedReported, actualExtension)) {
            if (allowedExtensions.includes(normalizedReported) || allowedExtensions.includes(actualExtension)) {
                return {
                    valid: true,
                    detectedType: actualExtension,
                    signatureMatch: true,
                    note: `${normalizedReported}와 ${actualExtension}는 호환 가능한 확장자입니다.`,
                    layer: 'L3_SIGNATURE'
                };
            } else {
                return {
                    valid: false,
                    reason: 'BLOCKED_BY_POLICY',
                    detail: `${normalizedReported}/${actualExtension} 확장자는 이 고객의 정책에서 허용되지 않습니다.`,
                    layer: 'L3_SIGNATURE'
                };
            }
        }

        // Case 3: 확장자 위조 의심 (보안 강화!) - 무조건 차단
        return {
            valid: false,
            reason: 'EXTENSION_FORGERY_DETECTED',
            detail: `보안상 위험: 파일이 .${reportedExtension}로 보고되었지만 실제로는 .${actualExtension} 파일입니다. 파일 확장자를 올바르게 수정한 후 다시 업로드해주세요.`,
            detectedType: actualExtension,
            reportedExtension: reportedExtension,
            securityRisk: 'HIGH',
            instruction: `올바른 확장자(.${actualExtension})로 파일명을 변경한 후 재업로드하시거나, 정말 .${reportedExtension} 파일이 필요한 경우 올바른 파일을 업로드해주세요.`,
            layer: 'L3_SIGNATURE'
        };
    }

    // 알 수 없는 시그니처 처리 (블랙리스트 모드 지원 추가!)
    async handleUnknownSignature(buffer, reportedExtension, customerId) {
        console.log('🤔 알 수 없는 시그니처, file-type 라이브러리 활용');

        // file-type 라이브러리로 재시도
        const detectedType = await fileTypeFromBuffer(buffer);

        if (detectedType) {
            console.log(`📄 file-type 감지: ${detectedType.ext} (${detectedType.mime})`);

            // 블랙리스트 모드로 정책 확인
            const allowedExtensions = await this.getCustomerAllowedExtensions(customerId);

            if (allowedExtensions.isBlockListMode) {
                const blockedExtensions = allowedExtensions.blockedExtensions;
                const normalizedReported = this.normalizeExtension(reportedExtension);
                const normalizedDetected = this.normalizeExtension(detectedType.ext);

                // 둘 다 차단 목록에 없으면 허용
                if (!blockedExtensions.includes(normalizedReported) && !blockedExtensions.includes(normalizedDetected)) {
                    return {
                        valid: true,
                        detectedType: detectedType.ext,
                        mimeType: detectedType.mime,
                        confidence: 'HIGH',
                        note: '표준 라이브러리에서 확인된 파일 타입입니다.',
                        layer: 'L3_FILETYPE_LIB'
                    };
                } else {
                    return {
                        valid: false,
                        reason: 'BLOCKED_BY_POLICY',
                        detail: `${normalizedReported} 또는 ${normalizedDetected} 확장자는 정책에서 차단되었습니다.`,
                        layer: 'L3_FILETYPE_LIB'
                    };
                }
            }

            // 기존 화이트리스트 모드 로직
            return {
                valid: true,
                detectedType: detectedType.ext,
                mimeType: detectedType.mime,
                confidence: 'HIGH',
                note: '표준 라이브러리에서 확인된 파일 타입입니다.',
                layer: 'L3_FILETYPE_LIB'
            };
        }

        // 텍스트 파일 휴리스틱
        if (this.isLikelyTextFile(buffer)) {
            // 블랙리스트 모드로 정책 확인
            const allowedExtensions = await this.getCustomerAllowedExtensions(customerId);

            if (allowedExtensions.isBlockListMode) {
                const blockedExtensions = allowedExtensions.blockedExtensions;
                const normalizedReported = this.normalizeExtension(reportedExtension);

                if (blockedExtensions.includes(normalizedReported)) {
                    return {
                        valid: false,
                        reason: 'BLOCKED_BY_POLICY',
                        detail: `${normalizedReported} 확장자는 정책에서 차단되었습니다.`,
                        layer: 'L3_HEURISTIC'
                    };
                }
            }

            return {
                valid: true,
                detectedType: 'text',
                confidence: 'MEDIUM',
                note: '텍스트 파일로 추정됩니다.',
                layer: 'L3_HEURISTIC'
            };
        }

        // 정말 알 수 없는 파일 - 블랙리스트 모드로 확인
        const allowedExtensions = await this.getCustomerAllowedExtensions(customerId);

        if (allowedExtensions.isBlockListMode) {
            const blockedExtensions = allowedExtensions.blockedExtensions;
            const normalizedReported = this.normalizeExtension(reportedExtension);

            if (blockedExtensions.includes(normalizedReported)) {
                return {
                    valid: false,
                    reason: 'BLOCKED_BY_POLICY',
                    detail: `${normalizedReported} 확장자는 정책에서 차단되었습니다.`,
                    layer: 'L3_UNKNOWN'
                };
            }
        }

        return {
            valid: true, // 블랙리스트에 없으면 기본 허용
            detectedType: 'unknown',
            confidence: 'LOW',
            warning: '파일 타입을 식별할 수 없습니다. 신뢰할 수 있는 출처인지 확인하세요.',
            layer: 'L3_UNKNOWN'
        };
    }

    // 텍스트 파일 휴리스틱 판단
    isLikelyTextFile(buffer) {
        if (buffer.length === 0) return true;

        const sampleSize = Math.min(1024, buffer.length);
        let textBytes = 0;

        for (let i = 0; i < sampleSize; i++) {
            const byte = buffer[i];
            // 출력 가능한 ASCII 문자 또는 일반적인 공백/개행 문자
            if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
                textBytes++;
            }
        }

        // 80% 이상이 텍스트 문자면 텍스트 파일로 판단
        return (textBytes / sampleSize) > 0.8;
    }

    // L2: 기본 파일 검증
    validateBasicFile(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return {
                valid: false,
                reason: 'FILE_TOO_LARGE',
                detail: `파일 크기가 너무 큽니다. 최대 ${maxSize / 1024 / 1024}MB까지 허용됩니다.`,
                layer: 'L2_BASIC'
            };
        }

        if (!file.originalname || file.originalname.length > 255) {
            return {
                valid: false,
                reason: 'INVALID_FILENAME',
                detail: '파일명이 유효하지 않거나 너무 깁니다.',
                layer: 'L2_BASIC'
            };
        }

        return { valid: true, layer: 'L2_BASIC' };
    }

    // 확장자 정규화
    normalizeExtension(ext) {
        if (!ext) return '';

        const extensionMap = {
            'jpeg': 'jpg',
            'tiff': 'tif',
            'mpeg': 'mpg'
        };

        const normalized = ext.toLowerCase().replace(/^\./, '');
        return extensionMap[normalized] || normalized;
    }

    // 호환 가능한 확장자 체크 (확장됨)
    isCompatibleExtension(reported, detected) {
        const compatibleGroups = [
            ['jpg', 'jpeg'],
            ['tif', 'tiff'],
            ['mpg', 'mpeg'],
            ['htm', 'html'],
            ['zip', 'docx', 'xlsx', 'pptx'], // Office 문서들 (모두 ZIP 기반)
        ];

        for (const group of compatibleGroups) {
            if (group.includes(reported) && group.includes(detected)) {
                return true;
            }
        }

        return false;
    }

    // 파일 확장자 추출
    extractFileExtension(filename) {
        if (!filename) return '';
        const parts = filename.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    }
}

module.exports = new ValidationService();