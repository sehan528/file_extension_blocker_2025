require('dotenv').config();

const app = require('./src/app');
const http = require('http');

const { testConnection } = require('./src/config/database');
const demoSetupService = require('./src/services/demo-setup.service');
const sessionCleanupScheduler = require('./src/utils/session-cleanup');


const PORT = process.env.PORT || 3000;
// const HOST = process.env.HOST || 'localhost';

const server = http.createServer(app);

async function startServer() {
    try {
        console.log('🚀 서버 시작 중...');

        // 1. 데이터베이스 연결 확인
        const dbConnected = await testConnection();
        if (!dbConnected) {
            throw new Error('데이터베이스 연결 실패');
        }

        // 2. 데모 계정 설정 (비동기로 처리)
        setTimeout(async () => {
            await demoSetupService.setupDemoAccounts();
        }, 2000); // 2초 후 실행 (DB 안정화 대기)

        // 3. 세션 정리 스케줄러 시작
        sessionCleanupScheduler.start();

        // 4. 서버 시작
        app.listen(PORT, () => {
            console.log(`✅ 서버가 포트 ${PORT}에서 실행 중입니다.`);
            console.log(`🌐 웹사이트: http://localhost:${PORT}`);
            console.log(`📡 API: http://localhost:${PORT}/api`);
            console.log(`💾 pgAdmin: http://localhost:5050 (admin@example.com / admin123)`);
        });

    } catch (error) {
        console.error('❌ 서버 시작 실패:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM 신호 [kill pid 명령 실행] 수신. 서버를 종료합니다...');
    server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT 신호 [터미널에서 Ctrl+C 입력] 수신. 서버를 종료합니다...');
    server.close(() => process.exit(0));
});

startServer();