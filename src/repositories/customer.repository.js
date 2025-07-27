const { query, transaction } = require('../config/database');

class CustomerRepository {
    // 사용자 ID로 고객 조회
    async findByUserId(userid) {
        const sql = `
            SELECT id, userid, password, name, email, created_at, updated_at
            FROM customer 
            WHERE userid = $1
        `;

        const result = await query(sql, [userid]);
        return result.rows[0] || null;
    }

    // 고객 ID로 조회
    async findById(customerId) {
        const sql = `
            SELECT id, userid, name, email, created_at, updated_at
            FROM customer 
            WHERE id = $1
        `;

        const result = await query(sql, [customerId]);
        return result.rows[0] || null;
    }

    // 새 고객 생성
    async create(customerData) {
        const sql = `
            INSERT INTO customer (userid, password, name, email)
            VALUES ($1, $2, $3, $4)
            RETURNING id, userid, name, email, created_at
        `;

        const result = await query(sql, [
            customerData.userid,
            customerData.password,
            customerData.name,
            customerData.email
        ]);

        return result.rows[0];
    }

    // 고객 정보 업데이트
    async update(customerId, updateData) {
        const setParts = [];
        const values = [];
        let paramIndex = 1;

        // 동적으로 업데이트할 필드 구성
        if (updateData.name !== undefined) {
            setParts.push(`name = $${paramIndex++}`);
            values.push(updateData.name);
        }

        if (updateData.email !== undefined) {
            setParts.push(`email = $${paramIndex++}`);
            values.push(updateData.email);
        }

        if (setParts.length === 0) {
            throw new Error('업데이트할 데이터가 없습니다.');
        }

        setParts.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(customerId);

        const sql = `
            UPDATE customer
            SET ${setParts.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING id, userid, name, email, updated_at
        `;

        const result = await query(sql, values);
        return result.rows[0];
    }

    // 비밀번호 업데이트
    async updatePassword(customerId, hashedPassword) {
        const sql = `
            UPDATE customer 
            SET password = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id
        `;

        const result = await query(sql, [hashedPassword, customerId]);
        return result.rows[0];
    }

    // 고객 삭제 (CASCADE로 관련 데이터도 삭제됨)
    async delete(customerId) {
        const sql = `
            DELETE FROM customer 
            WHERE id = $1
            RETURNING id, userid, name
        `;

        const result = await query(sql, [customerId]);
        return result.rows[0];
    }

    // 이메일로 고객 조회
    async findByEmail(email) {
        const sql = `
            SELECT id, userid, name, email, created_at
            FROM customer 
            WHERE email = $1
        `;

        const result = await query(sql, [email]);
        return result.rows[0] || null;
    }

    // 고객 목록 조회 (관리자용)
    async findAll(limit = 50, offset = 0) {
        const sql = `
            SELECT id, userid, name, email, created_at
            FROM customer 
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        `;

        const result = await query(sql, [limit, offset]);
        return result.rows;
    }

    // 고객 수 조회
    async count() {
        const sql = `SELECT COUNT(*) as count FROM customer`;
        const result = await query(sql);
        return parseInt(result.rows[0].count);
    }

    // 고객 통계 정보
    async getStatistics() {
        const sql = `
            SELECT 
                COUNT(*) as total_customers,
                COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_this_week,
                COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_this_month
            FROM customer
        `;

        const result = await query(sql);
        return result.rows[0];
    }

    // 고객과 관련된 정책 통계
    async getCustomerPolicyStats(customerId) {
        const sql = `
            SELECT 
                (SELECT COUNT(*) FROM fixed_extension_policy WHERE customer_id = $1) as fixed_extensions,
                (SELECT COUNT(*) FROM fixed_extension_status WHERE customer_id = $1 AND is_blocked = true) as blocked_fixed,
                (SELECT COUNT(*) FROM custom_extension WHERE customer_id = $1) as custom_extensions,
                (SELECT COUNT(*) FROM uploaded_file WHERE customer_id = $1) as uploaded_files
        `;

        const result = await query(sql, [customerId]);
        return result.rows[0];
    }
}

module.exports = new CustomerRepository();