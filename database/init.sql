-- 파일 확장자 차단 시스템 데이터베이스 스키마

-- 1. customer 테이블 (고객 정보)
CREATE TABLE customer (
                            id SERIAL PRIMARY KEY,

    -- 간단한 로그인 정보
                            userid VARCHAR(50) UNIQUE NOT NULL,
                            password VARCHAR(255) NOT NULL,

    -- 고객 정보
                            name VARCHAR(255) NOT NULL,
                            email VARCHAR(255),

    -- 메타데이터
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. extension 테이블 (확장자 기본 정보)
CREATE TABLE extension (
                            id SERIAL PRIMARY KEY,

    -- 확장자 정보
                            extension_name VARCHAR(20) NOT NULL UNIQUE,

    -- 메타데이터
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. customer_extension_policy 테이블 (고객별 확장자 정책) - 핵심 테이블
CREATE TABLE customer_extension_policy (
                                            id SERIAL PRIMARY KEY,

    -- 관계 (JOIN 테이블 역할)
                                            customer_id INTEGER NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
                                            extension_id INTEGER NOT NULL REFERENCES extension(id) ON DELETE CASCADE,

    -- 정책 설정
                                            is_blocked BOOLEAN NOT NULL DEFAULT false,
                                            is_fixed_extension BOOLEAN NOT NULL DEFAULT false,  -- 고정 확장자 여부

    -- 메타데이터
                                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 제약조건
                                            UNIQUE(customer_id, extension_id)
);

-- 4. uploaded_file 테이블 (업로드된 파일 이력 - 간소화)
CREATE TABLE uploaded_file (
                                id SERIAL PRIMARY KEY,

    -- 관계
                                customer_id INTEGER NOT NULL REFERENCES customer(id) ON DELETE CASCADE,

    -- 파일 정보
                                original_filename VARCHAR(500) NOT NULL,
                                file_extension VARCHAR(20),
                                file_size BIGINT,

    -- S3 정보
                                s3_bucket VARCHAR(255),
                                s3_key VARCHAR(500),

    -- 메타데이터
                                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성 (성능 최적화)

-- customer 테이블 인덱스
CREATE UNIQUE INDEX idx_customer_userid ON customer(userid);

-- extension 테이블 인덱스
CREATE UNIQUE INDEX idx_extension_name ON extension(extension_name);

-- customer_extension_policy 테이블 인덱스
CREATE UNIQUE INDEX idx_customer_extension_unique ON customer_extension_policy(customer_id, extension_id);
CREATE INDEX idx_customer_policy ON customer_extension_policy(customer_id);
CREATE INDEX idx_customer_fixed ON customer_extension_policy(customer_id, is_fixed_extension);
CREATE INDEX idx_policy_blocked ON customer_extension_policy(customer_id, is_blocked) WHERE is_blocked = true;

-- uploaded_file 테이블 인덱스
CREATE INDEX idx_uploaded_file_customer ON uploaded_file(customer_id);
CREATE INDEX idx_uploaded_file_extension ON uploaded_file(file_extension);
CREATE INDEX idx_uploaded_file_date ON uploaded_file(uploaded_at DESC);