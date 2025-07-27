const authService = require('../services/auth.service');

class AuthController {
    // 로그인
    async login(req, res) {
        try {
            const { userid, password } = req.body;

            console.log('🔐 로그인 요청:', { userid });

            // 입력 검증
            if (!userid || !password) {
                return res.status(400).json({
                    success: false,
                    error: '사용자 ID와 비밀번호를 입력해주세요.'
                });
            }

            const result = await authService.login(userid, password, req);

            if (result.success) {
                // 쿠키에 세션 ID 설정 (HttpOnly, Secure) - EC2 HTTP 환경에 맞게 수정
                res.cookie('session_id', result.data.sessionId, {
                    httpOnly: true,
                    secure: false,  // HTTP에서도 동작하도록 변경
                    sameSite: 'lax', // 'strict'에서 'lax'로 변경
                    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000, // 24시간
                    path: '/' // 명시적 경로 설정
                });

                res.json({
                    success: true,
                    message: '로그인 성공',
                    data: {
                        user: result.data.user
                    }
                });
            } else {
                res.status(401).json({
                    success: false,
                    error: result.error
                });
            }

        } catch (error) {
            console.error('❌ 로그인 컨트롤러 오류:', error);
            res.status(500).json({
                success: false,
                error: '서버 오류가 발생했습니다.'
            });
        }
    }

    // 회원가입
    async register(req, res) {
        try {
            const { userid, password, name, email } = req.body;

            console.log('📝 회원가입 요청:', { userid, name, email });

            // 필수 입력 검증
            if (!userid || !password || !name) {
                return res.status(400).json({
                    success: false,
                    error: '사용자 ID, 비밀번호, 이름은 필수 입력사항입니다.'
                });
            }

            const result = await authService.register({
                userid,
                password,
                name,
                email
            });

            if (result.success) {
                res.status(201).json({
                    success: true,
                    message: '회원가입이 완료되었습니다.',
                    data: result.data
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }

        } catch (error) {
            console.error('❌ 회원가입 컨트롤러 오류:', error);
            res.status(500).json({
                success: false,
                error: '서버 오류가 발생했습니다.'
            });
        }
    }

    // 로그아웃
    async logout(req, res) {
        try {
            const sessionId = req.cookies?.session_id;

            if (sessionId) {
                // 세션 삭제
                await authService.logout(sessionId);
            }

            // 쿠키 삭제 - 설정 옵션과 일치하도록 수정
            res.clearCookie('session_id', {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                path: '/'
            });

            res.json({
                success: true,
                message: '로그아웃되었습니다.'
            });

        } catch (error) {
            console.error('❌ 로그아웃 컨트롤러 오류:', error);
            res.status(500).json({
                success: false,
                error: '서버 오류가 발생했습니다.'
            });
        }
    }

    // 현재 사용자 정보 조회
    async getCurrentUser(req, res) {
        try {
            const customerId = req.user.id; // 미들웨어에서 설정됨

            const result = await authService.getCurrentUser(customerId);

            if (result.success) {
                res.json({
                    success: true,
                    data: result.data
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: result.error
                });
            }

        } catch (error) {
            console.error('❌ 사용자 정보 조회 컨트롤러 오류:', error);
            res.status(500).json({
                success: false,
                error: '서버 오류가 발생했습니다.'
            });
        }
    }

    // 비밀번호 변경
    async changePassword(req, res) {
        try {
            const customerId = req.user.id;
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    error: '현재 비밀번호와 새 비밀번호를 입력해주세요.'
                });
            }

            const result = await authService.changePassword(customerId, currentPassword, newPassword);

            if (result.success) {
                res.json({
                    success: true,
                    message: result.message
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }

        } catch (error) {
            console.error('❌ 비밀번호 변경 컨트롤러 오류:', error);
            res.status(500).json({
                success: false,
                error: '서버 오류가 발생했습니다.'
            });
        }
    }

    // 세션 검증 (클라이언트에서 로그인 상태 확인용)
    async verifySession(req, res) {
        try {
            // 미들웨어에서 이미 세션 검증이 완료된 상태
            res.json({
                success: true,
                data: {
                    user: req.user,
                    sessionData: req.sessionData
                }
            });

        } catch (error) {
            console.error('❌ 세션 검증 컨트롤러 오류:', error);
            res.status(500).json({
                success: false,
                error: '서버 오류가 발생했습니다.'
            });
        }
    }

    // 계정 삭제 (회원 탈퇴)
    async deleteAccount(req, res) {
        try {
            const customerId = req.user.id;
            const sessionId = req.sessionId;
            const { password } = req.body;

            if (!password) {
                return res.status(400).json({
                    success: false,
                    error: '비밀번호를 입력해주세요.'
                });
            }

            // 비밀번호 재확인
            const loginResult = await authService.login(req.user.userid, password, req);
            if (!loginResult.success) {
                return res.status(401).json({
                    success: false,
                    error: '비밀번호가 일치하지 않습니다.'
                });
            }

            // 모든 세션 삭제
            const sessionRepository = require('../repositories/session.repository');
            await sessionRepository.deleteAllUserSessions(customerId);

            // 계정 삭제 (CASCADE로 관련 데이터도 삭제)
            const customerRepository = require('../repositories/customer.repository');
            await customerRepository.delete(customerId);

            // 쿠키 삭제 - 설정 옵션과 일치하도록 수정
            res.clearCookie('session_id', {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                path: '/'
            });

            res.json({
                success: true,
                message: '계정이 성공적으로 삭제되었습니다.'
            });

        } catch (error) {
            console.error('❌ 계정 삭제 컨트롤러 오류:', error);
            res.status(500).json({
                success: false,
                error: '서버 오류가 발생했습니다.'
            });
        }
    }

    // 활성 세션 목록 조회
    async getActiveSessions(req, res) {
        try {
            const customerId = req.user.id;
            const sessionRepository = require('../repositories/session.repository');

            const sessions = await sessionRepository.getUserActiveSessions(customerId);

            res.json({
                success: true,
                data: {
                    sessions: sessions,
                    currentSessionId: req.sessionId
                }
            });

        } catch (error) {
            console.error('❌ 활성 세션 조회 컨트롤러 오류:', error);
            res.status(500).json({
                success: false,
                error: '서버 오류가 발생했습니다.'
            });
        }
    }

    // 특정 세션 삭제 (다른 기기에서 로그아웃)
    async deleteSession(req, res) {
        try {
            const { sessionId } = req.params;
            const customerId = req.user.id;
            const sessionRepository = require('../repositories/session.repository');

            // 세션이 현재 사용자 소유인지 확인
            const session = await sessionRepository.findSession(sessionId);
            if (!session || session.customer_id !== customerId) {
                return res.status(404).json({
                    success: false,
                    error: '세션을 찾을 수 없습니다.'
                });
            }

            await sessionRepository.deleteSession(sessionId);

            res.json({
                success: true,
                message: '세션이 삭제되었습니다.'
            });

        } catch (error) {
            console.error('❌ 세션 삭제 컨트롤러 오류:', error);
            res.status(500).json({
                success: false,
                error: '서버 오류가 발생했습니다.'
            });
        }
    }
}

module.exports = new AuthController();