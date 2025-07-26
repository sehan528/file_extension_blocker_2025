const express = require('express');
const helmetConfig = require('./config/helmet');
const corsConfig = require('./config/cors');
const setupMiddlewares = require('./config/middlewares');

const app = express();

// 보안 설정
app.use(helmetConfig);
app.use(corsConfig);

// 기본 미들웨어
setupMiddlewares(app);

// 라우트
app.get('/', (req, res) => {
    res.send('express');
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: '기본 구조 설정 완료',
        timestamp: new Date().toISOString()
    });
});

module.exports = app;