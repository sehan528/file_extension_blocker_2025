const authService = require('../services/auth.service');

class SessionCleanupScheduler {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.cleanupInterval = 60 * 60 * 1000; // 1시간마다 실행
    }

    // 스케줄러 시작
    start() {
        if (this.isRunning) {
            console.log('⚠️ 세션 정리 스케줄러가 이미 실행 중입니다.');
            return;
        }

        console.log('🕒 세션 정리 스케줄러 시작 (1시간 간격)');

        // 즉시 한 번 실행
        this.runCleanup();

        // 주기적 실행 설정
        this.intervalId = setInterval(() => {
            this.runCleanup();
        }, this.cleanupInterval);

        this.isRunning = true;
    }

    // 스케줄러 중지
    stop() {
        if (!this.isRunning) {
            console.log('⚠️ 세션 정리 스케줄러가 실행되고 있지 않습니다.');
            return;
        }

        console.log('🛑 세션 정리 스케줄러 중지');

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.isRunning = false;
    }

    // 정리 작업 실행
    async runCleanup() {
        try {
            console.log('🧹 만료된 세션 정리 시작...');

            const result = await authService.cleanupExpiredSessions();

            if (result.deletedCount > 0) {
                console.log(`✅ 만료된 세션 정리 완료: ${result.deletedCount}개 삭제`);
            } else {
                console.log('✅ 정리할 만료된 세션이 없습니다.');
            }

        } catch (error) {
            console.error('❌ 세션 정리 중 오류:', error);
        }
    }

    // 상태 확인
    getStatus() {
        return {
            isRunning: this.isRunning,
            cleanupInterval: this.cleanupInterval,
            nextCleanup: this.isRunning ?
                new Date(Date.now() + this.cleanupInterval).toISOString() :
                null
        };
    }

    // 수동 정리 실행
    async manualCleanup() {
        console.log('🔧 수동 세션 정리 실행');
        await this.runCleanup();
    }
}

module.exports = new SessionCleanupScheduler();