# 파일 확장자 차단 시스템 - PostgreSQL 초기화 스크립트 (Windows)

Write-Host "🚀 PostgreSQL 데이터베이스 완전 초기화 중..." -ForegroundColor Green

# 기존 컨테이너와 볼륨 완전 삭제
Write-Host "🧹 기존 컨테이너 및 볼륨 정리 중..." -ForegroundColor Yellow
docker-compose down -v
docker volume prune -f

# 새로 시작
Write-Host "🆕 새로운 PostgreSQL 컨테이너 시작..." -ForegroundColor Green
docker-compose up -d postgres

Write-Host "⏳ PostgreSQL 초기화 대기 중..." -ForegroundColor Yellow

# PostgreSQL 준비 상태 확인 (더 긴 대기 시간)
$maxAttempts = 30
$attempt = 0
do {
    $attempt++
    Write-Host "⏳ PostgreSQL 연결 시도 ($attempt/$maxAttempts)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    $result = docker-compose exec postgres pg_isready -U postgres -d file_security_db 2>$null
    if ($LASTEXITCODE -eq 0) {
        break
    }
} while ($attempt -lt $maxAttempts)

if ($attempt -ge $maxAttempts) {
    Write-Host "❌ PostgreSQL 시작 실패" -ForegroundColor Red
    exit 1
}

# 추가 대기 (초기화 스크립트 실행 완료 대기)
Write-Host "⏳ 초기화 스크립트 실행 완료 대기..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "✅ PostgreSQL이 준비되었습니다!" -ForegroundColor Green

# 데이터베이스 연결 정보 출력
Write-Host ""
Write-Host "📊 데이터베이스 연결 정보:" -ForegroundColor Cyan
Write-Host "  Host: localhost"
Write-Host "  Port: 5432"
Write-Host "  Database: file_security_db"
Write-Host "  Username: postgres"
Write-Host "  Password: postgres123"

Write-Host ""
Write-Host "🔧 pgAdmin 접속 정보 (선택사항):" -ForegroundColor Cyan
Write-Host "  URL: http://localhost:5050"
Write-Host "  Email: admin@example.com"
Write-Host "  Password: admin123"

Write-Host ""
Write-Host "✅ PostgreSQL 환경 구축 완료!" -ForegroundColor Green

# 데이터 확인
Write-Host ""
Write-Host "📋 초기 데이터 확인:" -ForegroundColor Cyan
docker-compose exec postgres psql -U postgres -d file_security_db -c "
SELECT 'customers' as table_name, count(*) as count FROM customer
UNION ALL
SELECT 'extensions', count(*) FROM extension
UNION ALL
SELECT 'policies', count(*) FROM customer_extension_policy
UNION ALL
SELECT 'uploaded_files', count(*) FROM uploaded_file;
"

Write-Host ""
Write-Host "🔍 고정 확장자 정책 확인:" -ForegroundColor Cyan
docker-compose exec postgres psql -U postgres -d file_security_db -c "
SELECT
    e.extension_name,
    cep.is_blocked,
    cep.is_fixed_extension
FROM customer_extension_policy cep
JOIN extension e ON cep.extension_id = e.id
WHERE cep.customer_id = 1 AND cep.is_fixed_extension = true
ORDER BY e.extension_name;
"

Write-Host ""
Write-Host "🏷️ 커스텀 확장자 정책 확인:" -ForegroundColor Cyan
docker-compose exec postgres psql -U postgres -d file_security_db -c "
SELECT
    e.extension_name,
    cep.is_blocked,
    cep.created_at
FROM customer_extension_policy cep
JOIN extension e ON cep.extension_id = e.id
WHERE cep.customer_id = 1 AND cep.is_fixed_extension = false
ORDER BY cep.created_at DESC;
"