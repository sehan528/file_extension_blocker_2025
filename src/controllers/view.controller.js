const path = require('path');

class ViewController {
    // 홈페이지 서빙
    serveHomePage(req, res) {
        res.sendFile(path.join(__dirname, '../../public', 'index.html'));
    }
}

module.exports = new ViewController();