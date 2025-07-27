const bcrypt = require('bcrypt');
const customerRepository = require('../repositories/customer.repository');

class DemoSetupService {
    async setupDemoAccounts() {
        try {
            console.log('🎭 데모 계정 설정 시작...');

            const demoAccounts = [
                { userid: 'demo1', password: 'flow1234', name: 'Conservative Corp' },
                { userid: 'demo2', password: 'flow1234', name: 'Secure Enterprise' }
            ];

            for (const account of demoAccounts) {
                const existingUser = await customerRepository.findByUserId(account.userid);

                if (existingUser && existingUser.password.startsWith('PLACEHOLDER_PASSWORD_')) {
                    // 플레이스홀더 비밀번호를 실제 해시로 변경
                    const hashedPassword = await bcrypt.hash(account.password, 10);

                    await customerRepository.updatePassword(existingUser.id, hashedPassword);

                    console.log(`✅ ${account.userid} 계정 비밀번호 설정 완료`);
                } else if (existingUser) {
                    console.log(`ℹ️ ${account.userid} 계정은 이미 설정됨`);
                } else {
                    console.log(`⚠️ ${account.userid} 계정을 찾을 수 없음`);
                }
            }

            console.log('🎉 데모 계정 설정 완료!');
            console.log('📋 로그인 정보:');
            console.log('   demo1 / flow1234');
            console.log('   demo2 / flow1234');

        } catch (error) {
            console.error('❌ 데모 계정 설정 실패:', error);
        }
    }

    async isDemoAccountReady(userid) {
        try {
            const user = await customerRepository.findByUserId(userid);
            return user && !user.password.startsWith('PLACEHOLDER_PASSWORD_');
        } catch (error) {
            return false;
        }
    }
}

module.exports = new DemoSetupService();