const path = require('path');
const logger = require('morgan');
const express = require('express');
const cookieParser = require('cookie-parser');

module.exports = (app) => {
    // 로깅
    app.use(logger(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

    // 파싱 미들웨어
    app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '10mb' }));
    app.use(express.urlencoded({
        extended: true,
        limit: process.env.MAX_FILE_SIZE || '10mb'
    }));
    app.use(cookieParser());

    // 정적 파일 서빙
    app.use(express.static(path.join(__dirname, '../../public')));
};