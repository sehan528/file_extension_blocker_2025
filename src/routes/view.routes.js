const express = require('express');
const router = express.Router();
const path = require('path');
const viewController = require('../controllers/view.controller');

console.log('🌐 View routes 로드 완료 (인증 페이지 포함)');

// 메인 페이지 (인증 필요)
router.get('/', viewController.serveHomePage);


// 인증 관련 페이지 (공개)

// 로그인 페이지
router.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public', 'login.html'));
});

// 로그인 페이지 (확장자 없는 경로)
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public', 'login.html'));
});

module.exports = router;