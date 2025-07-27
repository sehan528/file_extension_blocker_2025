CREATE TABLE customer (
                          id SERIAL PRIMARY KEY,
                          userid VARCHAR(50) UNIQUE NOT NULL,
                          password VARCHAR(255) NOT NULL,
                          name VARCHAR(255) NOT NULL,
                          email VARCHAR(255),
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 통합 확장자 테이블 (모든 확장자 관리)
CREATE TABLE extension (
                           id SERIAL PRIMARY KEY,
                           extension_name VARCHAR(20) NOT NULL UNIQUE,
                           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 고객별 고정 확장자 범위 설정
CREATE TABLE fixed_extension_policy (
                                        id SERIAL PRIMARY KEY,
                                        customer_id INTEGER NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
                                        extension_id INTEGER NOT NULL REFERENCES extension(id) ON DELETE CASCADE,
                                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                        UNIQUE(customer_id, extension_id)
);

-- 고정 확장자 체크/언체크 상태
CREATE TABLE fixed_extension_status (
                                        id SERIAL PRIMARY KEY,
                                        customer_id INTEGER NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
                                        extension_id INTEGER NOT NULL REFERENCES extension(id) ON DELETE CASCADE,
                                        is_blocked BOOLEAN NOT NULL DEFAULT true,
                                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                        UNIQUE(customer_id, extension_id)
);

-- 고객별 커스텀 확장자 (extension 테이블 참조)
CREATE TABLE custom_extension (
                                  id SERIAL PRIMARY KEY,
                                  customer_id INTEGER NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
                                  extension_id INTEGER NOT NULL REFERENCES extension(id) ON DELETE CASCADE,
                                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                  UNIQUE(customer_id, extension_id)
);

-- 업로드 파일 이력 (extension 테이블 참조)
CREATE TABLE uploaded_file (
                               id SERIAL PRIMARY KEY,
                               customer_id INTEGER NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
                               original_filename VARCHAR(500) NOT NULL,
                               extension_id INTEGER REFERENCES extension(id),
                               file_size BIGINT,
                               s3_bucket VARCHAR(255),
                               s3_key VARCHAR(500),
                               uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 세션 저장 테이블 추가
CREATE TABLE user_sessions (
                               session_id VARCHAR(255) PRIMARY KEY,
                               customer_id INTEGER NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
                               session_data TEXT NOT NULL,
                               expires_at TIMESTAMP NOT NULL,
                               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                               updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                               ip_address INET,
                               user_agent TEXT
);

-- 인덱스 생성
CREATE UNIQUE INDEX idx_customer_userid ON customer(userid);
CREATE UNIQUE INDEX idx_extension_name ON extension(extension_name);
CREATE UNIQUE INDEX idx_fixed_policy_unique ON fixed_extension_policy(customer_id, extension_id);
CREATE INDEX idx_fixed_policy_customer ON fixed_extension_policy(customer_id);
CREATE UNIQUE INDEX idx_fixed_status_unique ON fixed_extension_status(customer_id, extension_id);
CREATE INDEX idx_fixed_status_customer ON fixed_extension_status(customer_id);
CREATE UNIQUE INDEX idx_custom_extension_unique ON custom_extension(customer_id, extension_id);
CREATE INDEX idx_custom_extension_customer ON custom_extension(customer_id);
CREATE INDEX idx_uploaded_file_customer ON uploaded_file(customer_id);
CREATE INDEX idx_uploaded_file_extension ON uploaded_file(extension_id);
CREATE INDEX idx_uploaded_file_date ON uploaded_file(uploaded_at DESC);

CREATE INDEX idx_sessions_customer_id ON user_sessions(customer_id);
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_sessions_created_at ON user_sessions(created_at DESC);

-- 만료된 세션 자동 정리를 위한 인덱스
-- CREATE INDEX idx_sessions_cleanup ON user_sessions(expires_at) WHERE expires_at < CURRENT_TIMESTAMP;