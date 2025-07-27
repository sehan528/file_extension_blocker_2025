const authService = require('../services/auth.service');

class AuthMiddleware {
    // 세션 기반 인증 미들웨어 (메인)
    // 세션 기반 인증 미들웨어 (메인)
    async authenticateSession(req, res, next) {
        try {
            const sessionId = req.cookies?.session_id;

            console.log('🔍 세션 인증 시도:', {
                sessionId: sessionId ? sessionId.substring(0, 8) + '...' : 'NONE',
                path: req.path,
                method: req.method,
                userAgent: req.get('User-Agent')?.substring(0, 50) + '...'
            });

            if (!sessionId) {
                console.log('❌ 세션 ID 없음');
                return res.status(401).json({
                    success: false,
                    error: '로그인이 필요합니다.',
                    code: 'NO_SESSION'
                });
            }

            // 세션 검증
            const verification = await authService.verifySession(sessionId);

            if (!verification.success) {
                console.log('❌ 세션 검증 실패:', verification.error);
                // 만료된 세션 쿠키 삭제
                res.clearCookie('session_id');

                return res.status(401).json({
                    success: false,
                    error: verification.error,
                    code: 'INVALID_SESSION'
                });
            }

            // 사용자 정보와 세션 데이터를 req 객체에 추가
            req.user = verification.data.user;
            req.sessionData = verification.data.sessionData;
            req.sessionId = sessionId;

            console.log('✅ 세션 인증 성공:', req.user.userid);
            next();

        } catch (error) {
            console.error('❌ 세션 인증 미들웨어 오류:', error);
            res.status(500).json({
                success: false,
                error: '인증 처리 중 오류가 발생했습니다.'
            });
        }
    }

    // 세션 연장 미들웨어 (선택적)
    async extendSessionIfNeeded(req, res, next) {
        try {
            if (req.sessionId && req.user) {
                // 세션 만료까지 1시간 미만이면 자동 연장
                const expiresAt = new Date(req.sessionData.expiresAt || 0);
                const now = new Date();
                const timeUntilExpiry = expiresAt.getTime() - now.getTime();
                const oneHour = 60 * 60 * 1000;

                if (timeUntilExpiry > 0 && timeUntilExpiry < oneHour) {
                    console.log('🔄 세션 자동 연장:', req.user.userid);

                    const extendResult = await authService.extendSession(req.sessionId);

                    if (extendResult.success) {
                        // 새로운 만료 시간으로 쿠키 업데이트
                        res.cookie('session_id', req.sessionId, {
                            httpOnly: true,
                            secure: process.env.NODE_ENV === 'production',
                            sameSite: 'strict',
                            expires: extendResult.expiresAt
                        });
                    }
                }
            }

            next();

        } catch (error) {
            console.error('❌ 세션 연장 미들웨어 오류:', error);
            // 오류가 있어도 계속 진행
            next();
        }
    }

    // 선택적 인증 (로그인하지 않아도 접근 가능, 하지만 로그인한 경우 사용자 정보 제공)
    async optionalAuth(req, res, next) {
        try {
            const sessionId = req.cookies?.session_id;

            if (sessionId) {
                const verification = await authService.verifySession(sessionId);

                if (verification.success) {
                    req.user = verification.data.user;
                    req.sessionData = verification.data.sessionData;
                    req.sessionId = sessionId;
                } else {
                    // 만료된 세션 쿠키 정리
                    res.clearCookie('session_id');
                }
            }

            next();

        } catch (error) {
            console.error('❌ 선택적 인증 미들웨어 오류:', error);
            // 오류가 있어도 계속 진행
            next();
        }
    }

    // 관리자 권한 확인 (추후 확장용)
    requireAdmin(req, res, next) {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: '로그인이 필요합니다.'
            });
        }

        // 여기서 관리자 권한 체크 로직 추가
        // 현재는 특정 사용자 ID로 간단히 체크
        const adminUsers = ['admin', 'superuser'];

        if (!adminUsers.includes(req.user.userid)) {
            return res.status(403).json({
                success: false,
                error: '관리자 권한이 필요합니다.'
            });
        }

        next();
    }

    // 본인 확인 (자신의 데이터에만 접근 가능)
    requireSelfOrAdmin(req, res, next) {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: '로그인이 필요합니다.'
            });
        }

        const requestedUserId = req.params.userId;
        const currentUserId = req.user.userid;

        // 본인이거나 관리자인 경우 허용
        const adminUsers = ['admin', 'superuser'];
        const isSelf = requestedUserId === currentUserId;
        const isAdmin = adminUsers.includes(currentUserId);

        if (!isSelf && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: '본인의 데이터에만 접근할 수 있습니다.'
            });
        }

        next();
    }

    // 개발 환경용 인증 우회 (테스트용)
    bypassAuthForDev(req, res, next) {
        if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
            console.log('⚠️ 개발 환경: 인증 우회');
            req.user = {
                id: 1,
                userid: 'demo1',
                name: 'Demo User 1'
            };
        }
        next();
    }

    // API 키 기반 인증 (추후 확장용)
    async authenticateApiKey(req, res, next) {
        try {
            const apiKey = req.headers['x-api-key'];

            if (!apiKey) {
                return res.status(401).json({
                    success: false,
                    error: 'API 키가 필요합니다.',
                    code: 'NO_API_KEY'
                });
            }

            // TODO: API 키 검증 로직 구현
            // const isValidApiKey = await validateApiKey(apiKey);

            return res.status(501).json({
                success: false,
                error: 'API 키 인증은 아직 구현되지 않았습니다.'
            });

        } catch (error) {
            console.error('❌ API 키 인증 오류:', error);
            res.status(500).json({
                success: false,
                error: 'API 키 인증 처리 중 오류가 발생했습니다.'
            });
        }
    }

    // 세션 정보 로깅 (디버그용)
    logSessionInfo(req, res, next) {
        if (req.user && process.env.NODE_ENV === 'development') {
            console.log('🔍 세션 정보:', {
                userId: req.user.userid,
                sessionId: req.sessionId?.substring(0, 8) + '...',
                ip: req.ip,
                userAgent: req.get('User-Agent')?.substring(0, 50) + '...'
            });
        }
        next();
    }
}

module.exports = new AuthMiddleware();