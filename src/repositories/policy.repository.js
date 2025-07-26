const { query, transaction } = require('../config/database');

class PolicyRepository {
    // 고정 확장자만 조회
    async getFixedExtensionPolicies(customerId) {
        const sql = `
            SELECT
                e.extension_name,
                COALESCE(fes.is_blocked, false) as is_blocked
            FROM fixed_extension_policy fep
                     JOIN extension e ON fep.extension_id = e.id
                     LEFT JOIN fixed_extension_status fes ON fep.customer_id = fes.customer_id
                AND fep.extension_id = fes.extension_id
            WHERE fep.customer_id = $1
            ORDER BY e.extension_name ASC
        `;

        const result = await query(sql, [customerId]);
        return result.rows;
    }

    // 커스텀 확장자만 조회
    async getCustomExtensionPolicies(customerId) {
        const sql = `
            SELECT
                e.extension_name,
                ce.created_at
            FROM custom_extension ce
                     JOIN extension e ON ce.extension_id = e.id
            WHERE ce.customer_id = $1
            ORDER BY ce.created_at DESC
        `;

        const result = await query(sql, [customerId]);
        return result.rows;
    }

    // 고정 확장자 차단 상태 업데이트
    async updateFixedExtension(customerId, extensionName, isBlocked) {
        const sql = `
            INSERT INTO fixed_extension_status (customer_id, extension_id, is_blocked)
            VALUES (
                       $1,
                       (SELECT id FROM extension WHERE extension_name = $2),
                       $3
                   )
            ON CONFLICT (customer_id, extension_id)
                DO UPDATE SET
                              is_blocked = $3,
                              updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        const result = await query(sql, [customerId, extensionName, isBlocked]);
        return result.rows[0];
    }

    // 커스텀 확장자 추가
    async addCustomExtension(customerId, extensionName) {
        return await transaction(async (client) => {
            // 1. extension 테이블에 확장자가 없으면 추가
            const extensionSql = `
                INSERT INTO extension (extension_name) 
                VALUES ($1) 
                ON CONFLICT (extension_name) DO NOTHING
                RETURNING id
            `;

            let extensionResult = await client.query(extensionSql, [extensionName]);

            // 이미 존재하는 경우 ID 조회
            if (extensionResult.rows.length === 0) {
                const selectSql = 'SELECT id FROM extension WHERE extension_name = $1';
                extensionResult = await client.query(selectSql, [extensionName]);
            }

            const extensionId = extensionResult.rows[0].id;

            // 2. 고객별 커스텀 확장자에 추가
            const customSql = `
                INSERT INTO custom_extension (customer_id, extension_id)
                VALUES ($1, $2)
                RETURNING *
            `;

            const customResult = await client.query(customSql, [customerId, extensionId]);
            return customResult.rows[0];
        });
    }

    // 커스텀 확장자 삭제
    async deleteCustomExtension(customerId, extensionName) {
        const sql = `
            DELETE FROM custom_extension
            WHERE customer_id = $1
              AND extension_id = (SELECT id FROM extension WHERE extension_name = $2)
            RETURNING *
        `;

        const result = await query(sql, [customerId, extensionName]);
        return result.rows[0];
    }

    // 커스텀 확장자 개수 조회
    async getCustomExtensionCount(customerId) {
        const sql = `
            SELECT COUNT(*) as count
            FROM custom_extension 
            WHERE customer_id = $1
        `;

        const result = await query(sql, [customerId]);
        return parseInt(result.rows[0].count);
    }

    // 확장자 중복 체크 (고정 + 커스텀 통합)
    async checkExtensionExists(customerId, extensionName) {
        const sql = `
            SELECT COUNT(*) as count
            FROM (
                     SELECT fep.customer_id, e.extension_name
                     FROM fixed_extension_policy fep
                              JOIN extension e ON fep.extension_id = e.id
                     WHERE fep.customer_id = $1 AND e.extension_name = $2

                     UNION

                     SELECT ce.customer_id, e.extension_name
                     FROM custom_extension ce
                              JOIN extension e ON ce.extension_id = e.id
                     WHERE ce.customer_id = $1 AND e.extension_name = $2
                 ) combined
        `;

        const result = await query(sql, [customerId, extensionName]);
        return parseInt(result.rows[0].count) > 0;
    }

    // 차단된 확장자 목록 조회 (기존 메서드 - 하위 호환성)
    async getBlockedExtensions(customerId) {
        const blockedList = await this.getAllBlockedExtensions(customerId);
        return blockedList.map(row => row.extension_name);
    }

    // 모든 차단된 확장자 조회 (고정 + 커스텀) - 새로 추가!
    async getAllBlockedExtensions(customerId) {
        const sql = `
            SELECT e.extension_name, 'fixed' as type
            FROM fixed_extension_status fes
                     JOIN extension e ON fes.extension_id = e.id
            WHERE fes.customer_id = $1 AND fes.is_blocked = true

            UNION

            SELECT e.extension_name, 'custom' as type
            FROM custom_extension ce
                     JOIN extension e ON ce.extension_id = e.id
            WHERE ce.customer_id = $1

            ORDER BY extension_name
        `;

        const result = await query(sql, [customerId]);
        return result.rows;
    }

    // 고정 확장자 범위 조회 (디버깅용) - 새로 추가!
    async getFixedExtensionRange(customerId) {
        const sql = `
            SELECT e.extension_name
            FROM fixed_extension_policy fep
                     JOIN extension e ON fep.extension_id = e.id
            WHERE fep.customer_id = $1
            ORDER BY e.extension_name
        `;

        const result = await query(sql, [customerId]);
        return result.rows.map(row => row.extension_name);
    }
}

module.exports = new PolicyRepository();