const { Pool } = require('pg');

// 환경변수 디버깅
console.log('🔍 환경변수 확인:', {
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD ? `***${process.env.DB_PASSWORD.length}글자***` : '***masked***'
});

// PostgreSQL 연결 설정
const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'file_security_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
    max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

console.log('🔧 실제 연결 설정:', {
    ...connectionConfig,
    password: '***masked***'
});

const pool = new Pool(connectionConfig);

// 연결 이벤트
pool.on('connect', () => {
    console.log('✅ PostgreSQL 데이터베이스에 연결되었습니다.');
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL 연결 오류:', err);
});

// 연결 확인 함수
async function testConnection() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time, version() as version');
        console.log('🔍 DB 연결 테스트 성공:', result.rows[0].current_time);
        client.release();
        return true;
    } catch (error) {
        console.error('❌ DB 연결 테스트 실패:', error.message);
        return false;
    }
}

// 쿼리 실행 헬퍼 함수
async function query(text, params) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('🔍 쿼리 실행:', {
            text: text.substring(0, 50) + '...',
            duration: `${duration}ms`,
            rows: result.rowCount
        });
        return result;
    } catch (error) {
        console.error('❌ 쿼리 실행 오류:', {
            text: text.substring(0, 50) + '...',
            error: error.message
        });
        throw error;
    }
}

// 트랜잭션 헬퍼
async function transaction(callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    pool,
    query,
    transaction,
    testConnection
};