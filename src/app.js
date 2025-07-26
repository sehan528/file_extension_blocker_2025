const express = require('express');
const helmetConfig = require('./config/helmet');
const corsConfig = require('./config/cors');
const setupMiddlewares = require('./config/middlewares');
const indexRouter = require('./routes/index.route');
const errorHandler = require('./utils/errorHandler');

const app = express();

// ===== 보안 설정 =====
app.use(helmetConfig);
app.use(corsConfig);

// ===== 기본 미들웨어 =====
setupMiddlewares(app);

// ===== 라우트 설정 =====
app.use('/', indexRouter);

// API Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: '파일 확장자 차단 시스템',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// TODO: API 라우트 추가 예정
// app.use('/api', apiRouter);

// ===== 에러 처리 =====
// 404 처리 (라우트가 매치되지 않은 경우)
app.use('/api/*', errorHandler.apiNotFoundHandler);
app.use('*', errorHandler.viewNotFoundHandler);

// 전역 에러 처리 (에러가 발생한 경우)
app.use('/api/*', errorHandler.apiErrorHandler);
app.use(errorHandler.viewErrorHandler);

module.exports = app;