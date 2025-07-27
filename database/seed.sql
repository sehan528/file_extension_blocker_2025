-- 확장자 마스터 데이터
INSERT INTO extension (extension_name) VALUES
                                           ('bat'), ('cmd'), ('com'), ('cpl'), ('exe'), ('scr'), ('js'),
                                           ('py'), ('rb'), ('vbs'), ('ps1'), ('sh'), ('mp3'), ('mp4'), ('avi'),
                                           ('pdf'), ('docx'), ('xlsx'), ('png'), ('jpg'), ('gif'), ('zip'), ('rar'),
                                           ('ju'), ('ch'), ('tmp');

-- 테스트 고객 계정 (password is 'flow1234')
INSERT INTO customer (userid, password, name, email) VALUES
                                                         ('demo1', '$2b$10$rOvGyKdQWVh.YP7V3jXzDuG/8G2tANmfHlQAk5R2kI8y4ZG7Q5oJq', 'Conservative Corp', 'admin@conservative.com'),
                                                         ('demo2', '$2b$10$rOvGyKdQWVh.YP7V3jXzDuG/8G2tANmfHlQAk5R2kI8y4ZG7Q5oJq', 'Secure Enterprise', 'security@secure-ent.com');

-- demo1: 고정 확장자 2개만 사용 (exe, bat)
INSERT INTO fixed_extension_policy (customer_id, extension_id)
SELECT 1, e.id FROM extension e WHERE e.extension_name IN ('exe', 'bat');

-- demo2: 고정 확장자 전체 사용 (7개)
INSERT INTO fixed_extension_policy (customer_id, extension_id)
SELECT 2, e.id FROM extension e WHERE e.extension_name IN ('bat', 'cmd', 'com', 'cpl', 'exe', 'scr', 'js');

-- demo2: 커스텀 확장자 예시 (extension_id로 참조)
INSERT INTO custom_extension (customer_id, extension_id)
SELECT 2, e.id FROM extension e WHERE e.extension_name IN ('ju', 'ch', 'tmp');

-- 샘플 파일 업로드 이력 (extension_id로 참조)
INSERT INTO uploaded_file (customer_id, original_filename, extension_id, file_size, uploaded_at) VALUES
                                                                                                     (1, 'document.pdf', (SELECT id FROM extension WHERE extension_name = 'pdf'), 1024000, NOW() - INTERVAL '1 day'),
                                                                                                     (1, 'presentation.pptx', NULL, 2048000, NOW() - INTERVAL '2 hours'), -- pptx는 extension 테이블에 없어서 NULL
                                                                                                     (2, 'report.docx', (SELECT id FROM extension WHERE extension_name = 'docx'), 2048000, NOW() - INTERVAL '3 hours'),
                                                                                                     (2, 'image.png', (SELECT id FROM extension WHERE extension_name = 'png'), 1024000, NOW() - INTERVAL '1 hour');

-- 활성 세션 샘플 데이터 (테스트용)
INSERT INTO user_sessions (session_id, customer_id, session_data, expires_at, ip_address, user_agent) VALUES
                                                                                                          ('demo_session_001', 1, '{"userid":"demo1","name":"Conservative Corp","loginTime":"2025-01-26T10:00:00Z"}', CURRENT_TIMESTAMP + INTERVAL '24 hours', '127.0.0.1', 'Mozilla/5.0 (Test Browser)'),
                                                                                                          ('demo_session_002', 2, '{"userid":"demo2","name":"Secure Enterprise","loginTime":"2025-01-26T11:00:00Z"}', CURRENT_TIMESTAMP + INTERVAL '24 hours', '127.0.0.1', 'Mozilla/5.0 (Test Browser)');

-- 만료된 세션 샘플 (정리 테스트용)
INSERT INTO user_sessions (session_id, customer_id, session_data, expires_at, ip_address) VALUES
    ('expired_session_001', 1, '{"userid":"demo1","expired":true}', CURRENT_TIMESTAMP - INTERVAL '1 hour', '127.0.0.1');