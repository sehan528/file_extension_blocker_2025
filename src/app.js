const express = require('express');
const helmetConfig = require('./config/helmet');
const corsConfig = require('./config/cors');

const app = express();

app.use(helmetConfig);
app.use(corsConfig);

app.use(express.json());

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