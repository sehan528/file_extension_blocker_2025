const {query, transaction} = require('../config/database');

class UploadRepository {
    // 업로드 이력 저장
    async saveUploadHistory(uploadData) {
        try {
            console.log('💾 업로드 이력 저장 시작:', uploadData);

            // extension_id 조회 (extension 테이블에서)
            let extensionId = null;
            if (uploadData.fileExtension) {
                const extensionResult = await query(
                    'SELECT id FROM extension WHERE extension_name = $1',
                    [uploadData.fileExtension]
                );

                if (extensionResult.rows.length > 0) {
                    extensionId = extensionResult.rows[0].id;
                    console.log(`🔍 확장자 ID 조회 성공: ${uploadData.fileExtension} -> ${extensionId}`);
                } else {
                    // extension 테이블에 없는 확장자면 추가
                    const insertResult = await query(
                        'INSERT INTO extension (extension_name) VALUES ($1) RETURNING id',
                        [uploadData.fileExtension]
                    );
                    extensionId = insertResult.rows[0].id;
                    console.log(`➕ 새 확장자 추가: ${uploadData.fileExtension} -> ${extensionId}`);
                }
            }

            // uploaded_file 테이블에 저장 (extension_id 사용!)
            const sql = `
                INSERT INTO uploaded_file (customer_id,
                                           original_filename,
                                           extension_id,
                                           file_size,
                                           s3_bucket,
                                           s3_key)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;

            const result = await query(sql, [
                uploadData.customerId,
                uploadData.originalFilename,
                extensionId, // extension_id 사용 (file_extension 아님!)
                uploadData.fileSize,
                uploadData.s3Bucket,
                uploadData.s3Key
            ]);

            console.log('✅ 업로드 이력 저장 성공:', result.rows[0].id);
            return result.rows[0];

        } catch (error) {
            console.error('❌ 업로드 이력 저장 실패:', error);
            throw error;
        }
    }

    // 고객별 업로드 이력 조회
    async getUploadHistory(customerId, limit = 10) {
        const sql = `
            SELECT uf.id,
                   uf.original_filename,
                   e.extension_name,
                   uf.file_size,
                   uf.s3_bucket,
                   uf.s3_key,
                   uf.uploaded_at
            FROM uploaded_file uf
                     LEFT JOIN extension e ON uf.extension_id = e.id
            WHERE uf.customer_id = $1
            ORDER BY uf.uploaded_at DESC
            LIMIT $2
        `;

        const result = await query(sql, [customerId, limit]);
        return result.rows;
    }

    // 특정 확장자 업로드 통계
    async getUploadStatsByExtension(customerId) {
        const sql = `
            SELECT e.extension_name,
                   COUNT(*)          as upload_count,
                   SUM(uf.file_size) as total_size
            FROM uploaded_file uf
                     LEFT JOIN extension e ON uf.extension_id = e.id
            WHERE uf.customer_id = $1
            GROUP BY e.extension_name
            ORDER BY upload_count DESC
        `;

        const result = await query(sql, [customerId]);
        return result.rows;
    }

    // 업로드 파일 삭제
    async deleteUploadHistory(uploadId, customerId) {
        const sql = `
            DELETE
            FROM uploaded_file
            WHERE id = $1
              AND customer_id = $2
            RETURNING *
        `;

        const result = await query(sql, [uploadId, customerId]);
        return result.rows[0];
    }

    // 특정 확장자로 업로드된 파일 개수 조회
    async getUploadCountByExtension(customerId, extensionName) {
        try {
            const sql = `
                SELECT COUNT(*)            as file_count,
                       MIN(uf.uploaded_at) as first_upload,
                       MAX(uf.uploaded_at) as last_upload
                FROM uploaded_file uf
                         JOIN extension e ON uf.extension_id = e.id
                WHERE uf.customer_id = $1
                  AND e.extension_name = $2
            `;

            const result = await query(sql, [customerId, extensionName]);

            const row = result.rows[0];
            return {
                count: parseInt(row.file_count),
                firstUpload: row.first_upload,
                lastUpload: row.last_upload
            };

        } catch (error) {
            console.error('❌ 확장자별 업로드 개수 조회 실패:', error);
            throw error;
        }
    }

    // 특정 확장자로 업로드된 파일 목록 조회 (상세 정보용)
    async getUploadedFilesByExtension(customerId, extensionName, limit = 5) {
        try {
            const sql = `
                SELECT uf.original_filename,
                       uf.file_size,
                       uf.uploaded_at
                FROM uploaded_file uf
                         JOIN extension e ON uf.extension_id = e.id
                WHERE uf.customer_id = $1
                  AND e.extension_name = $2
                ORDER BY uf.uploaded_at DESC
                LIMIT $3
            `;

            const result = await query(sql, [customerId, extensionName, limit]);
            return result.rows;

        } catch (error) {
            console.error('❌ 확장자별 업로드 파일 목록 조회 실패:', error);
            throw error;
        }
    }

    // 커스텀 확장자 추가 전 충돌 검사
    async checkExtensionConflict(customerId, extensionName) {
        try {
            const uploadStats = await this.getUploadCountByExtension(customerId, extensionName);

            if (uploadStats.count > 0) {
                const recentFiles = await this.getUploadedFilesByExtension(customerId, extensionName, 3);

                return {
                    hasConflict: true,
                    fileCount: uploadStats.count,
                    firstUpload: uploadStats.firstUpload,
                    lastUpload: uploadStats.lastUpload,
                    recentFiles: recentFiles
                };
            }

            return {
                hasConflict: false,
                fileCount: 0
            };

        } catch (error) {
            console.error('❌ 확장자 충돌 검사 실패:', error);
            throw error;
        }
    }

}

module.exports = new UploadRepository();