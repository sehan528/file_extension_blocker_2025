const bcrypt = require('bcrypt');
const crypto = require('crypto');
const customerRepository = require('../repositories/customer.repository');
const sessionRepository = require('../repositories/session.repository');

class AuthService {
    // 세션 설정
    get sessionConfig() {
        return {
            secret: process.env.SESSION_SECRET || 'your-super-secret-session-key-minimum-32-characters',
            maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000, // 24시간
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        };
    }

    // 로그인
    async login(userid, password, req) {
        try {
            console.log('🔐 로그인 시도:', { userid });

            // 사용자 조회
            const customer = await customerRepository.findByUserId(userid);
            if (!customer) {
                return {
                    success: false,
                    error: '존재하지 않는 사용자입니다.'
                };
            }

            // 비밀번호 검증
            const isPasswordValid = await bcrypt.compare(password, customer.password);
            if (!isPasswordValid) {
                return {
                    success: false,
                    error: '비밀번호가 일치하지 않습니다.'
                };
            }

            // 세션 생성
            const sessionResult = await this.createSession(customer, req);

            console.log('✅ 로그인 성공:', {
                userid: customer.userid,
                name: customer.name,
                sessionId: sessionResult.sessionId.substring(0, 8) + '...'
            });

            return {
                success: true,
                data: {
                    sessionId: sessionResult.sessionId,
                    user: {
                        id: customer.id,
                        userid: customer.userid,
                        name: customer.name,
                        email: customer.email
                    }
                }
            };

        } catch (error) {
            console.error('❌ 로그인 오류:', error);
            return {
                success: false,
                error: '로그인 처리 중 오류가 발생했습니다.'
            };
        }
    }

    // 회원가입
    async register(userData) {
        try {
            console.log('📝 회원가입 시도:', { userid: userData.userid, name: userData.name });

            // 입력 검증
            const validation = this.validateUserData(userData);
            if (!validation.isValid) {
                return {
                    success: false,
                    error: validation.error
                };
            }

            // 중복 사용자 확인
            const existingUser = await customerRepository.findByUserId(userData.userid);
            if (existingUser) {
                return {
                    success: false,
                    error: '이미 존재하는 사용자 ID입니다.'
                };
            }

            // 비밀번호 해시화
            const hashedPassword = await bcrypt.hash(userData.password, 10);

            // 사용자 생성
            const newCustomer = await customerRepository.create({
                userid: userData.userid,
                password: hashedPassword,
                name: userData.name,
                email: userData.email
            });

            // 신규 고객의 고정 확장자 정책 초기화
            await this.initializeCustomerPolicies(newCustomer.id);

            console.log('✅ 회원가입 성공:', { id: newCustomer.id, userid: newCustomer.userid });

            return {
                success: true,
                data: {
                    user: {
                        id: newCustomer.id,
                        userid: newCustomer.userid,
                        name: newCustomer.name,
                        email: newCustomer.email
                    }
                }
            };

        } catch (error) {
            console.error('❌ 회원가입 오류:', error);
            return {
                success: false,
                error: '회원가입 처리 중 오류가 발생했습니다.'
            };
        }
    }

    // 세션 생성
    async createSession(customer, req) {
        const sessionId = this.generateSessionId();
        const expiresAt = new Date(Date.now() + this.sessionConfig.maxAge);

        const sessionData = {
            sessionId: sessionId,
            customerId: customer.id,
            data: {
                userid: customer.userid,
                name: customer.name,
                email: customer.email,
                loginTime: new Date().toISOString()
            },
            expiresAt: expiresAt,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent')
        };

        await sessionRepository.createSession(sessionData);

        console.log('✅ 세션 생성 완료:', {
            sessionId: sessionId.substring(0, 8) + '...',
            expiresAt: expiresAt.toISOString()
        });

        return { sessionId, expiresAt };
    }

    // 세션 ID 생성
    generateSessionId() {
        return crypto.randomBytes(32).toString('hex');
    }

    // 세션 검증 (디버깅 추가)
    async verifySession(sessionId) {
        try {
            console.log('🔍 세션 검증 시작:', sessionId.substring(0, 8) + '...');

            const session = await sessionRepository.findSession(sessionId);

            if (!session) {
                console.log('❌ 세션을 찾을 수 없음');
                return {
                    success: false,
                    error: '유효하지 않은 세션입니다.'
                };
            }

            console.log('✅ 세션 검증 성공:', {
                userid: session.userid,
                expiresAt: session.expires_at
            });

            return {
                success: true,
                data: {
                    user: {
                        id: session.customer_id,
                        userid: session.userid,
                        name: session.name,
                        email: session.email
                    },
                    sessionData: session.session_data,
                    expiresAt: session.expires_at
                }
            };

        } catch (error) {
            console.error('❌ 세션 검증 실패:', error);
            return {
                success: false,
                error: '세션 검증 중 오류가 발생했습니다.'
            };
        }
    }

    // 로그아웃 (세션 삭제)
    async logout(sessionId) {
        try {
            const result = await sessionRepository.deleteSession(sessionId);

            if (result) {
                console.log('✅ 로그아웃 성공:', result.session_id);
                return { success: true };
            } else {
                return {
                    success: false,
                    error: '세션을 찾을 수 없습니다.'
                };
            }

        } catch (error) {
            console.error('❌ 로그아웃 오류:', error);
            return {
                success: false,
                error: '로그아웃 처리 중 오류가 발생했습니다.'
            };
        }
    }

    // 세션 연장
    async extendSession(sessionId) {
        try {
            const newExpiresAt = new Date(Date.now() + this.sessionConfig.maxAge);
            const result = await sessionRepository.extendSession(sessionId, newExpiresAt);

            if (result) {
                console.log('🔄 세션 연장 성공:', sessionId);
                return { success: true, expiresAt: result.expires_at };
            } else {
                return {
                    success: false,
                    error: '세션을 찾을 수 없습니다.'
                };
            }

        } catch (error) {
            console.error('❌ 세션 연장 오류:', error);
            return {
                success: false,
                error: '세션 연장 중 오류가 발생했습니다.'
            };
        }
    }

    // 만료된 세션 정리
    async cleanupExpiredSessions() {
        try {
            const deletedCount = await sessionRepository.cleanupExpiredSessions();
            console.log(`🧹 만료된 세션 정리 완료: ${deletedCount}개 삭제`);
            return { deletedCount };

        } catch (error) {
            console.error('❌ 세션 정리 오류:', error);
            return { deletedCount: 0 };
        }
    }

    // 현재 사용자 정보 조회
    async getCurrentUser(customerId) {
        try {
            const customer = await customerRepository.findById(customerId);
            if (!customer) {
                return {
                    success: false,
                    error: '사용자를 찾을 수 없습니다.'
                };
            }

            return {
                success: true,
                data: {
                    id: customer.id,
                    userid: customer.userid,
                    name: customer.name,
                    email: customer.email,
                    createdAt: customer.created_at
                }
            };
        } catch (error) {
            console.error('❌ 사용자 정보 조회 오류:', error);
            return {
                success: false,
                error: '사용자 정보 조회 중 오류가 발생했습니다.'
            };
        }
    }

    // 비밀번호 변경
    async changePassword(customerId, currentPassword, newPassword) {
        try {
            const customer = await customerRepository.findById(customerId);
            if (!customer) {
                return {
                    success: false,
                    error: '사용자를 찾을 수 없습니다.'
                };
            }

            // 현재 비밀번호 확인
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, customer.password);
            if (!isCurrentPasswordValid) {
                return {
                    success: false,
                    error: '현재 비밀번호가 일치하지 않습니다.'
                };
            }

            // 새 비밀번호 검증
            if (newPassword.length < 6) {
                return {
                    success: false,
                    error: '새 비밀번호는 최소 6자 이상이어야 합니다.'
                };
            }

            // 새 비밀번호 해시화 및 업데이트
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            await customerRepository.updatePassword(customerId, hashedNewPassword);

            console.log('✅ 비밀번호 변경 성공:', customerId);

            return {
                success: true,
                message: '비밀번호가 성공적으로 변경되었습니다.'
            };

        } catch (error) {
            console.error('❌ 비밀번호 변경 오류:', error);
            return {
                success: false,
                error: '비밀번호 변경 중 오류가 발생했습니다.'
            };
        }
    }

    // 사용자 데이터 검증
    validateUserData(userData) {
        if (!userData.userid || userData.userid.length < 3 || userData.userid.length > 50) {
            return {
                isValid: false,
                error: '사용자 ID는 3-50자 사이여야 합니다.'
            };
        }

        if (!userData.password || userData.password.length < 6) {
            return {
                isValid: false,
                error: '비밀번호는 최소 6자 이상이어야 합니다.'
            };
        }

        if (!userData.name || userData.name.length < 2 || userData.name.length > 255) {
            return {
                isValid: false,
                error: '이름은 2-255자 사이여야 합니다.'
            };
        }

        if (userData.email && !this.isValidEmail(userData.email)) {
            return {
                isValid: false,
                error: '올바른 이메일 형식이 아닙니다.'
            };
        }

        if (!/^[a-zA-Z0-9_]+$/.test(userData.userid)) {
            return {
                isValid: false,
                error: '사용자 ID는 영문, 숫자, 언더스코어만 사용 가능합니다.'
            };
        }

        return { isValid: true };
    }

    // 이메일 형식 검증
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // 신규 고객 정책 초기화
    async initializeCustomerPolicies(customerId) {
        try {
            const policyRepository = require('../repositories/policy.repository');

            const fixedExtensions = ['bat', 'cmd', 'com', 'cpl', 'exe', 'scr', 'js'];

            for (const extension of fixedExtensions) {
                await policyRepository.initializeFixedExtensionPolicy(customerId, extension);
            }

            console.log('✅ 신규 고객 정책 초기화 완료:', customerId);

        } catch (error) {
            console.error('❌ 신규 고객 정책 초기화 실패:', error);
            throw error;
        }
    }
}

module.exports = new AuthService();