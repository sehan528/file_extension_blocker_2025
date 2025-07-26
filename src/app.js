const express = require('express');
const helmetConfig = require('./config/helmet');
const corsConfig = require('./config/cors');
const setupMiddlewares = require('./config/middlewares');
const indexRouter = require('./routes/index.route');
const apiRouter = require('./routes/api/index.route');
const errorHandler = require('./utils/errorHandler');

const app = express();

// ===== 보안 설정 =====
app.use(helmetConfig);
app.use(corsConfig);

// ===== 기본 미들웨어 =====
setupMiddlewares(app);

// ===== 라우트 설정 =====
app.use('/', indexRouter);
app.use('/api', apiRouter);


// ===== 에러 처리 =====
// 404 처리 (라우트가 매치되지 않은 경우)
app.use('/api/*', errorHandler.apiNotFoundHandler);
app.use('*', errorHandler.viewNotFoundHandler);

// 전역 에러 처리 (에러가 발생한 경우)
app.use('/api/*', errorHandler.apiErrorHandler);
app.use(errorHandler.viewErrorHandler);

module.exports = app;