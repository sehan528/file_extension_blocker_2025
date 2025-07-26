require('dotenv').config();

const app = require('./src/app');
const http = require('http');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const server = http.createServer(app);

server.listen(PORT, HOST, () => {
    console.log(`파일 확장자 차단 시스템이 실행 중입니다.`);
    console.log(`웹 인터페이스: http://${HOST}:${PORT}`);
    console.log(`데이터베이스: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
    console.log(`환경: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM 신호 수신. 서버를 종료합니다...');
    server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT 신호 수신. 서버를 종료합니다...');
    server.close(() => process.exit(0));
});