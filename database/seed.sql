-- =====================================
-- 1. 확장자 마스터 데이터
-- =====================================

INSERT INTO extension (extension_name) VALUES
-- 과제에서 명시된 고정 확장자 7개
('bat'),
('cmd'),
('com'),
('cpl'),
('exe'),
('scr'),
('js'),

-- PDF 예시 화면의 커스텀 확장자
('sh'),
('ju'),
('ch'),

-- 추가 확장자
('py'),
('rb'),
('vbs'),
('ps1');

-- =====================================
-- 2. 테스트 고객사 2개 생성 (컬럼명 변경)
-- =====================================

-- 비밀번호는 bcrypt로 해시화된 'password123'
-- 2-1. 보수적 정책 회사 (최소한의 차단)
INSERT INTO customer (userid, password, name, email) VALUES
    ('demo1', '$2b$10$rOvGyKdQWVh.YP7V3jXzDuG/8G2tANmfHlQAk5R2kI8y4ZG7Q5oJq', 'Conservative Corp', 'admin@conservative.com');

-- 2-2. 엄격한 정책 회사 (강력한 보안)
INSERT INTO customer (userid, password, name, email) VALUES
    ('demo2', '$2b$10$rOvGyKdQWVh.YP7V3jXzDuG/8G2tANmfHlQAk5R2kI8y4ZG7Q5oJq', 'Secure Enterprise', 'security@secure-ent.com');

-- =====================================
-- 3. 테스트 계정 A: Conservative Corp (보수적 정책)
-- =====================================

-- 3-1. 고정 확장자 정책 (7개 중 2개만 차단)
INSERT INTO customer_extension_policy (customer_id, extension_id, is_blocked, is_fixed_extension)
SELECT
    1 as customer_id,
    e.id as extension_id,
    CASE
        WHEN e.extension_name IN ('exe', 'bat') THEN true  -- 2개만 차단
        ELSE false  -- 나머지는 허용
        END as is_blocked,
    true as is_fixed_extension
FROM extension e
WHERE e.extension_name IN ('bat', 'cmd', 'com', 'cpl', 'exe', 'scr', 'js');

-- 3-2. 커스텀 확장자 없음 (보수적 정책이므로)

-- =====================================
-- 4. 테스트 계정 B: Secure Enterprise (엄격한 정책)
-- =====================================

-- 4-1. 고정 확장자 정책 (7개 중 5개 차단)
INSERT INTO customer_extension_policy (customer_id, extension_id, is_blocked, is_fixed_extension)
SELECT
    2 as customer_id,
    e.id as extension_id,
    CASE
        WHEN e.extension_name IN ('exe', 'bat', 'cmd', 'scr', 'js') THEN true  -- 5개 차단
        ELSE false  -- com, cpl은 허용
        END as is_blocked,
    true as is_fixed_extension
FROM extension e
WHERE e.extension_name IN ('bat', 'cmd', 'com', 'cpl', 'exe', 'scr', 'js');

-- 4-2. 커스텀 확장자 추가 (PDF 예시 + α)
INSERT INTO customer_extension_policy (customer_id, extension_id, is_blocked, is_fixed_extension)
SELECT
    2 as customer_id,
    e.id as extension_id,
    true as is_blocked,  -- 커스텀 확장자는 기본적으로 차단
    false as is_fixed_extension
FROM extension e
WHERE e.extension_name IN ('sh', 'ju', 'ch', 'py', 'vbs');

-- =====================================
-- 5. 샘플 파일 업로드 이력 (데모용)
-- =====================================

-- 5-1. Conservative Corp 업로드 이력
INSERT INTO uploaded_file (customer_id, original_filename, file_extension, file_size, s3_bucket, s3_key, uploaded_at) VALUES
    (1, 'document.pdf', 'pdf', 1024000, 'file-security-files', 'ex/1/files/document_20250725_001.pdf', NOW() - INTERVAL '1 day'),
    (1, 'presentation.pptx', 'pptx', 2048000, 'file-security-files', 'ex/1/files/presentation_20250725_002.pptx', NOW() - INTERVAL '2 hours'),
    (1, 'data.xlsx', 'xlsx', 512000, 'file-security-files', 'ex/1/files/data_20250725_003.xlsx', NOW() - INTERVAL '30 minutes');

-- 5-2. Secure Enterprise 업로드 이력
INSERT INTO uploaded_file (customer_id, original_filename, file_extension, file_size, s3_bucket, s3_key, uploaded_at) VALUES
    (2, 'report.docx', 'docx', 2048000, 'file-security-files', 'ex/2/files/report_20250725_001.docx', NOW() - INTERVAL '3 hours'),
    (2, 'image.png', 'png', 1024000, 'file-security-files', 'ex/2/files/image_20250725_002.png', NOW() - INTERVAL '1 hour'),
    (2, 'manual.pdf', 'pdf', 4096000, 'file-security-files', 'ex/2/files/manual_20250725_003.pdf', NOW() - INTERVAL '15 minutes');

-- =====================================
-- 6. 테스트 계정 로그인 정보
-- =====================================

-- 계정 1: Conservative Corp (보수적 정책)
--   ID: demo_customer_conservative
--   비밀번호: password123
--   회사명: Conservative Corp
--   정책: exe, bat만 차단 (나머지 허용)
--   커스텀 확장자: 없음
--
-- 계정 2: Secure Enterprise (엄격한 정책)
--   ID: demo_customer_strict
--   비밀번호: password123
--   회사명: Secure Enterprise
--   정책: exe, bat, cmd, scr, js 차단 + 커스텀 5개
--   커스텀 확장자: sh, ju, ch, py, vbs