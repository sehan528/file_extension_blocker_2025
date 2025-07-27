const { query, transaction } = require('../config/database');

class SessionRepository {
    // 세션 생성
    async createSession(sessionData) {
        const sql = `
            INSERT INTO user_sessions (session_id, customer_id, session_data, expires_at, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING session_id, created_at
        `;

        const result = await query(sql, [
            sessionData.sessionId,
            sessionData.customerId,
            JSON.stringify(sessionData.data),
            sessionData.expiresAt,
            sessionData.ipAddress,
            sessionData.userAgent
        ]);

        return result.rows[0];
    }

    // 세션 조회
    async findSession(sessionId) {
        const sql = `
            SELECT
                us.session_id,
                us.customer_id,
                us.session_data,
                us.expires_at,
                us.ip_address,
                us.user_agent,
                us.created_at,
                c.userid,
                c.name,
                c.email
            FROM user_sessions us
            JOIN customer c ON us.customer_id = c.id
            WHERE us.session_id = $1 
                AND us.expires_at > CURRENT_TIMESTAMP
        `;

        const result = await query(sql, [sessionId]);

        if (result.rows.length > 0) {
            const session = result.rows[0];
            return {
                ...session,
                session_data: JSON.parse(session.session_data)
            };
        }

        return null;
    }

    // 세션 업데이트
    async updateSession(sessionId, sessionData, newExpiresAt) {
        const sql = `
            UPDATE user_sessions
            SET
                session_data = $2,
                expires_at = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE session_id = $1
            RETURNING session_id, updated_at
        `;

        const result = await query(sql, [
            sessionId,
            JSON.stringify(sessionData),
            newExpiresAt
        ]);

        return result.rows[0];
    }

    // 세션 삭제 (로그아웃)
    async deleteSession(sessionId) {
        const sql = `
            DELETE FROM user_sessions
            WHERE session_id = $1
            RETURNING session_id, customer_id
        `;

        const result = await query(sql, [sessionId]);
        return result.rows[0];
    }

    // 사용자의 모든 세션 삭제
    async deleteAllUserSessions(customerId) {
        const sql = `
            DELETE FROM user_sessions
            WHERE customer_id = $1
        `;

        const result = await query(sql, [customerId]);
        return { deleted_count: result.rowCount };
    }

    // 만료된 세션 정리
    async cleanupExpiredSessions() {
        const sql = `
            DELETE FROM user_sessions
            WHERE expires_at < CURRENT_TIMESTAMP
        `;

        const result = await query(sql);
        return result.rowCount; // rowCount 직접 반환
    }

    // 사용자별 활성 세션 목록
    async getUserActiveSessions(customerId) {
        const sql = `
            SELECT
                session_id,
                ip_address,
                user_agent,
                created_at,
                expires_at
            FROM user_sessions
            WHERE customer_id = $1
              AND expires_at > CURRENT_TIMESTAMP
            ORDER BY created_at DESC
        `;

        const result = await query(sql, [customerId]);
        return result.rows;
    }

    // 세션 통계
    async getSessionStatistics() {
        const sql = `
            SELECT
                COUNT(*) as total_sessions,
                COUNT(CASE WHEN expires_at > CURRENT_TIMESTAMP THEN 1 END) as active_sessions,
                COUNT(CASE WHEN expires_at <= CURRENT_TIMESTAMP THEN 1 END) as expired_sessions,
                COUNT(DISTINCT customer_id) as unique_users
            FROM user_sessions
        `;

        const result = await query(sql);
        return result.rows[0];
    }

    // 세션 연장
    async extendSession(sessionId, newExpiresAt) {
        const sql = `
            UPDATE user_sessions
            SET
                expires_at = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE session_id = $1
              AND expires_at > CURRENT_TIMESTAMP
            RETURNING session_id, expires_at
        `;

        const result = await query(sql, [sessionId, newExpiresAt]);
        return result.rows[0];
    }
}

module.exports = new SessionRepository();