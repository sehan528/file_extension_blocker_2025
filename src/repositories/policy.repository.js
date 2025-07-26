const { query, transaction } = require('../config/database');

class PolicyRepository {
    // 고정 확장자만 조회
    async getFixedExtensionPolicies(customerId) {
        const sql = `
            SELECT 
                e.extension_name,
                cep.is_blocked
            FROM customer_extension_policy cep
            JOIN extension e ON cep.extension_id = e.id
            WHERE cep.customer_id = $1 AND cep.is_fixed_extension = true
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
                cep.created_at
            FROM customer_extension_policy cep
            JOIN extension e ON cep.extension_id = e.id
            WHERE cep.customer_id = $1 AND cep.is_fixed_extension = false
            ORDER BY cep.created_at DESC
        `;

        const result = await query(sql, [customerId]);
        return result.rows;
    }

    // 고정 확장자 차단 상태 업데이트
    async updateFixedExtension(customerId, extensionName, isBlocked) {
        const sql = `
            UPDATE customer_extension_policy 
            SET 
                is_blocked = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE customer_id = $1 
                AND extension_id = (SELECT id FROM extension WHERE extension_name = $2)
                AND is_fixed_extension = true
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

            // 2. 고객별 정책에 커스텀 확장자로 추가
            const policySql = `
                INSERT INTO customer_extension_policy (customer_id, extension_id, is_blocked, is_fixed_extension)
                VALUES ($1, $2, true, false)
                RETURNING *
            `;

            const policyResult = await client.query(policySql, [customerId, extensionId]);
            return policyResult.rows[0];
        });
    }

    // 커스텀 확장자 삭제
    async deleteCustomExtension(customerId, extensionName) {
        const sql = `
            DELETE FROM customer_extension_policy 
            WHERE customer_id = $1 
                AND extension_id = (SELECT id FROM extension WHERE extension_name = $2)
                AND is_fixed_extension = false
            RETURNING *
        `;

        const result = await query(sql, [customerId, extensionName]);
        return result.rows[0];
    }

    // 커스텀 확장자 개수 조회
    async getCustomExtensionCount(customerId) {
        const sql = `
            SELECT COUNT(*) as count
            FROM customer_extension_policy 
            WHERE customer_id = $1 AND is_fixed_extension = false
        `;

        const result = await query(sql, [customerId]);
        return parseInt(result.rows[0].count);
    }

    // 확장자 중복 체크
    async checkExtensionExists(customerId, extensionName) {
        const sql = `
            SELECT COUNT(*) as count
            FROM customer_extension_policy cep
            JOIN extension e ON cep.extension_id = e.id
            WHERE cep.customer_id = $1 AND e.extension_name = $2
        `;

        const result = await query(sql, [customerId, extensionName]);
        return parseInt(result.rows[0].count) > 0;
    }

    // 차단된 확장자 목록 조회
    async getBlockedExtensions(customerId) {
        const sql = `
            SELECT e.extension_name
            FROM customer_extension_policy cep
            JOIN extension e ON cep.extension_id = e.id
            WHERE cep.customer_id = $1 AND cep.is_blocked = true
        `;

        const result = await query(sql, [customerId]);
        return result.rows.map(row => row.extension_name);
    }
}

module.exports = new PolicyRepository();