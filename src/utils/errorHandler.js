class ErrorHandler {
    // API 에러 핸들러
    apiErrorHandler(err, req, res, next) {
        console.error('API Error:', err);

        const status = err.status || 500;
        const message = process.env.NODE_ENV === 'production'
            ? '서버 내부 오류가 발생했습니다.'
            : err.message;

        res.status(status).json({
            success: false,
            error: message,
            timestamp: new Date().toISOString(),
            path: req.path
        });
    }

    // 일반 페이지 에러 핸들러
    viewErrorHandler(err, req, res, next) {
        console.error('View Error:', err);

        const status = err.status || 500;
        const message = process.env.NODE_ENV === 'production'
            ? '서버 내부 오류가 발생했습니다.'
            : err.message;

        res.status(status).send(`
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>오류 발생</title>
                <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body>
                <div class="min-h-screen flex items-center justify-center bg-red-50">
                    <div class="text-center">
                        <h1 class="text-4xl font-bold text-red-600 mb-4">오류 발생</h1>
                        <p class="text-gray-700 mb-4">${message}</p>
                        <p class="text-sm text-gray-500 mb-4">에러 코드: ${status}</p>
                        <a href="/" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors">홈으로 돌아가기</a>
                    </div>
                </div>
            </body>
            </html>
        `);
    }

    // API 404 핸들러
    apiNotFoundHandler(req, res) {
        res.status(404).json({
            success: false,
            error: 'API 엔드포인트를 찾을 수 없습니다.',
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString()
        });
    }

    // 일반 페이지 404 핸들러
    viewNotFoundHandler(req, res) {
        res.status(404).send(`
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>페이지를 찾을 수 없습니다</title>
                <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body>
                <div class="min-h-screen flex items-center justify-center bg-gray-100">
                    <div class="text-center">
                        <h1 class="text-6xl font-bold text-gray-800 mb-4">404</h1>
                        <p class="text-xl text-gray-600 mb-4">페이지를 찾을 수 없습니다</p>
                        <p class="text-sm text-gray-500 mb-6">요청하신 페이지: ${req.path}</p>
                        <a href="/" class="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors">홈으로 돌아가기</a>
                    </div>
                </div>
            </body>
            </html>
        `);
    }
}

module.exports = new ErrorHandler();