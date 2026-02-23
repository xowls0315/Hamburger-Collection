-- 햄버거 모음 사이트 데이터베이스 초기화 스크립트
-- Supabase SQL Editor 또는 DBeaver(PostgreSQL)에서 그대로 실행하세요.
-- 스키마: "hamburger-collection" (백엔드 .env 에 DB_SCHEMA=hamburger-collection 설정 필요)

-- 1. UUID 생성: gen_random_uuid() 사용 (PostgreSQL 13+ 내장, Supabase/DBeaver 공통)
--    (PostgreSQL 12 이하에서만 CREATE EXTENSION IF NOT EXISTS "uuid-ossp" 후 uuid_generate_v4() 사용)

-- 2. 스키마 생성 및 검색 경로 설정
CREATE SCHEMA IF NOT EXISTS "hamburger-collection";
SET search_path TO "hamburger-collection", public;

-- 3. 브랜드 테이블
CREATE TABLE IF NOT EXISTS "hamburger-collection".brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    logo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 사용자 테이블 (카카오 로그인 + 일반 회원가입 지원)
CREATE TABLE IF NOT EXISTS "hamburger-collection".users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kakao_id VARCHAR(100) UNIQUE,
    login_id VARCHAR(50) UNIQUE,
    password VARCHAR(255),
    email VARCHAR(255),
    nickname VARCHAR(100) NOT NULL,
    profile_image VARCHAR(500),
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 카카오 로그인: kakao_id 설정, login_id/password/email NULL
-- 일반 회원가입: login_id, password, email, nickname 설정, kakao_id NULL

-- 5. 메뉴 아이템 테이블
CREATE TABLE IF NOT EXISTS "hamburger-collection".menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES "hamburger-collection".brands(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    image_url VARCHAR(500),
    detail_url VARCHAR(500),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 영양정보 테이블
CREATE TABLE IF NOT EXISTS "hamburger-collection".nutrition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID UNIQUE NOT NULL REFERENCES "hamburger-collection".menu_items(id) ON DELETE CASCADE,
    kcal DECIMAL(10, 2),
    protein DECIMAL(10, 2),
    "saturatedFat" DECIMAL(10, 2),
    sodium DECIMAL(10, 2),
    sugar DECIMAL(10, 2)
);

-- 7. 게시글 테이블
CREATE TABLE IF NOT EXISTS "hamburger-collection".posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "hamburger-collection".users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. 댓글 테이블
CREATE TABLE IF NOT EXISTS "hamburger-collection".comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES "hamburger-collection".posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES "hamburger-collection".users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. 즐겨찾기 테이블
CREATE TABLE IF NOT EXISTS "hamburger-collection".favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "hamburger-collection".users(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES "hamburger-collection".menu_items(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, menu_item_id)
);

-- 10. 수집 로그 테이블 (옵션)
CREATE TABLE IF NOT EXISTS "hamburger-collection".ingest_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES "hamburger-collection".brands(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    changed_count INTEGER DEFAULT 0,
    error TEXT,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_menu_items_brand_id ON "hamburger-collection".menu_items(brand_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON "hamburger-collection".menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_active ON "hamburger-collection".menu_items(is_active);
CREATE INDEX IF NOT EXISTS idx_nutrition_menu_item_id ON "hamburger-collection".nutrition(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON "hamburger-collection".posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON "hamburger-collection".posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON "hamburger-collection".comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON "hamburger-collection".comments(user_id);
CREATE INDEX IF NOT EXISTS idx_users_kakao_id ON "hamburger-collection".users(kakao_id);
CREATE INDEX IF NOT EXISTS idx_users_login_id ON "hamburger-collection".users(login_id);
CREATE INDEX IF NOT EXISTS idx_brands_slug ON "hamburger-collection".brands(slug);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON "hamburger-collection".favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_menu_item_id ON "hamburger-collection".favorites(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON "hamburger-collection".favorites(created_at DESC);

-- 12. 시드 데이터 삽입 (브랜드)
INSERT INTO "hamburger-collection".brands (slug, name) VALUES
    ('mcdonalds', '맥도날드'),
    ('burgerking', '버거킹'),
    ('lotteria', '롯데리아'),
    ('momstouch', '맘스터치'),
    ('kfc', 'KFC'),
    ('nobrand', '노브랜드버거'),
    ('frank', '프랭크버거')
ON CONFLICT (slug) DO NOTHING;

-- 13. 트리거 함수 생성 (updated_at 자동 업데이트, 스키마 내에 생성)
CREATE OR REPLACE FUNCTION "hamburger-collection".update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. 트리거 생성 (EXECUTE PROCEDURE: PostgreSQL 10 이하 호환)
CREATE TRIGGER update_brands_updated_at
    BEFORE UPDATE ON "hamburger-collection".brands
    FOR EACH ROW EXECUTE PROCEDURE "hamburger-collection".update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON "hamburger-collection".users
    FOR EACH ROW EXECUTE PROCEDURE "hamburger-collection".update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
    BEFORE UPDATE ON "hamburger-collection".menu_items
    FOR EACH ROW EXECUTE PROCEDURE "hamburger-collection".update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON "hamburger-collection".posts
    FOR EACH ROW EXECUTE PROCEDURE "hamburger-collection".update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON "hamburger-collection".comments
    FOR EACH ROW EXECUTE PROCEDURE "hamburger-collection".update_updated_at_column();

-- 완료 메시지
SELECT '데이터베이스 초기화가 완료되었습니다! (스키마: hamburger-collection)' AS message;
