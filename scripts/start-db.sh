#!/bin/bash


echo "🚀 파일 확장자 차단 시스템 데이터베이스 시작..."

# Docker Compose 실행
echo "📦 Docker Compose 실행 중..."
docker-compose up -d

# 헬스체크 대기
echo "⏳ PostgreSQL 헬스체크 대기 중..."
timeout=60
counter=0

while [ $counter -lt $timeout ]; do
    if docker-compose exec -T postgres pg_isready -U postgres -d file_security_db > /dev/null 2>&1; then
        echo "✅ PostgreSQL 준비 완료!"
        break
    fi
    echo "⏳ 대기 중... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 2))
done

if [ $counter -ge $timeout ]; then
    echo "❌ PostgreSQL 시작 타임아웃"
    exit 1
fi

# 연결 정보 출력
echo ""
echo "🎉 데이터베이스 환경 준비 완료!"
echo ""
echo "📋 연결 정보:"
echo "   호스트: localhost"
echo "   포트: 5432"
echo "   데이터베이스: file_security_db"
echo "   사용자: postgres"
echo "   비밀번호: postgres123"
echo ""
echo "🔧 pgAdmin 접속:"
echo "   URL: http://localhost:5050"
echo "   이메일: admin@example.com"
echo "   비밀번호: admin123"
echo ""
echo "📊 테스트 계정:"
echo "   1. Conservative Corp (demo_customer_conservative)"
echo "   2. Secure Enterprise (demo_customer_strict)"
echo ""
echo "🔧 유용한 명령어:"
echo "   데이터베이스 중지: docker-compose down"
echo "   데이터베이스 재시작: docker-compose restart postgres"
echo "   로그 확인: docker-compose logs postgres"