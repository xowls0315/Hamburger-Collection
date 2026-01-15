# 백엔드 설치 및 설정 가이드

이 문서는 햄버거 모음 사이트 백엔드의 설치 및 초기 설정 방법을 설명합니다.

---

## 📋 목차

1. [사전 요구사항](#1-사전-요구사항)
2. [프로젝트 설정](#2-프로젝트-설정)
3. [데이터베이스 설정](#3-데이터베이스-설정)
4. [환경 변수 설정](#4-환경-변수-설정)
5. [애플리케이션 실행](#5-애플리케이션-실행)
6. [파일 구조](#6-파일-구조)

---

## 1. 사전 요구사항

다음 소프트웨어가 설치되어 있어야 합니다:

- **Node.js**: 18.x 이상
- **npm**: 9.x 이상 (Node.js와 함께 설치됨)
- **PostgreSQL**: 14.x 이상
- **DBeaver**: 데이터베이스 관리 도구 (선택사항)

### Node.js 설치 확인

```bash
node --version
npm --version
```

---

## 2. 프로젝트 설정

### 2.1 의존성 설치

```bash
cd backend
npm install
```

### 2.2 설치되는 주요 패키지

- **@nestjs/typeorm**: TypeORM 통합
- **@nestjs/jwt**: JWT 토큰 생성/검증
- **@nestjs/passport**: 인증 미들웨어
- **@nestjs/config**: 환경 변수 관리
- **typeorm**: ORM 라이브러리
- **pg**: PostgreSQL 드라이버
- **passport-jwt**: JWT 전략
- **cookie-parser**: 쿠키 파싱
- **axios**: HTTP 클라이언트
- **bcrypt**: 비밀번호 해싱
- **class-validator**: DTO 검증

---

## 3. 데이터베이스 설정

### 3.1 PostgreSQL 데이터베이스 생성

#### 방법 1: DBeaver 사용

1. DBeaver 실행
2. 새 데이터베이스 연결 생성
   - 호스트: `localhost`
   - 포트: `5432`
   - 데이터베이스: `postgres` (기본)
   - 사용자명: `postgres`
   - 비밀번호: 설정한 비밀번호
3. 연결 후 SQL 편집기 열기
4. 다음 SQL 실행:

```sql
-- 데이터베이스 생성
CREATE DATABASE hamburger_collection;

-- 생성된 데이터베이스로 연결
\c hamburger_collection;
```

#### 방법 2: psql 명령어 사용

```bash
# PostgreSQL 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE hamburger_collection;

# 데이터베이스 연결
\c hamburger_collection;
```

### 3.2 테이블 생성 및 초기화

DBeaver에서:

1. `hamburger_collection` 데이터베이스에 연결
2. SQL 편집기 열기 (Ctrl+Enter 또는 우클릭 → SQL 편집기)
3. `database/init.sql` 파일의 내용을 복사하여 실행
4. 또는 파일을 직접 열어서 실행

**실행 방법:**
- 전체 스크립트 실행: `Ctrl+Alt+X` 또는 실행 버튼 클릭
- 특정 쿼리만 실행: 선택 후 `Ctrl+Enter`

### 3.3 데이터베이스 연결 확인

```sql
-- 테이블 목록 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 브랜드 데이터 확인
SELECT * FROM brands;
```

---

## 4. 환경 변수 설정

### 4.1 .env 파일 생성

```bash
cd backend
cp .env.example .env
```

### 4.2 .env 파일 수정

`.env` 파일을 열어서 다음 값들을 수정하세요:

```env
# 데이터베이스 설정
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_actual_password
DATABASE_NAME=hamburger_collection

# JWT 설정 (반드시 변경!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-characters
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_EXPIRATION=7d

# 카카오 OAuth 설정
KAKAO_REST_API_KEY=your_kakao_rest_api_key
KAKAO_REDIRECT_URI=http://localhost:3001/auth/kakao/callback
KAKAO_CLIENT_SECRET=your_kakao_client_secret

# 카카오 로컬 API 설정
KAKAO_LOCAL_API_KEY=your_kakao_local_api_key

# 서버 설정
PORT=3001
NODE_ENV=development

# 프론트엔드 URL
FRONTEND_URL=http://localhost:3000
```

### 4.3 카카오 API 키 발급

1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. 애플리케이션 등록
3. 플랫폼 설정 → Web 플랫폼 추가
   - 사이트 도메인: `http://localhost:3001`
4. Redirect URI 등록: `http://localhost:3001/auth/kakao/callback`
5. REST API 키 및 Client Secret 복사하여 `.env`에 입력
6. 카카오 로컬 API 키 발급 (제품 설정 → 카카오 로컬 API 활성화)

---

## 5. 애플리케이션 실행

### 5.1 개발 모드 실행

```bash
npm run start:dev
```

서버가 `http://localhost:3001`에서 실행됩니다.

### 5.2 프로덕션 빌드

```bash
# 빌드
npm run build

# 프로덕션 실행
npm run start:prod
```

### 5.3 실행 확인

브라우저에서 다음 URL 접속:

```
http://localhost:3001
```

또는 API 테스트:

```bash
curl http://localhost:3001/brands
```

---

## 6. 파일 구조

```
backend/
├── src/
│   ├── app.module.ts              # 루트 모듈
│   ├── main.ts                    # 애플리케이션 진입점
│   │
│   ├── auth/                      # 인증 모듈
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   ├── strategies/            # JWT 전략
│   │   │   ├── jwt.strategy.ts
│   │   │   └── jwt-refresh.strategy.ts
│   │   └── guards/                # 가드
│   │       └── jwt-auth.guard.ts
│   │
│   ├── users/                     # 사용자 모듈
│   │   ├── users.module.ts
│   │   ├── users.service.ts
│   │   ├── users.controller.ts
│   │   └── entities/
│   │       └── user.entity.ts
│   │
│   ├── brands/                    # 브랜드 모듈
│   │   ├── brands.module.ts
│   │   ├── brands.service.ts
│   │   ├── brands.controller.ts
│   │   └── entities/
│   │       └── brand.entity.ts
│   │
│   ├── menu-items/                # 메뉴 아이템 모듈
│   │   ├── menu-items.module.ts
│   │   ├── menu-items.service.ts
│   │   ├── menu-items.controller.ts
│   │   └── entities/
│   │       └── menu-item.entity.ts
│   │
│   ├── nutrition/                 # 영양정보 모듈
│   │   ├── nutrition.module.ts
│   │   ├── nutrition.service.ts
│   │   └── entities/
│   │       └── nutrition.entity.ts
│   │
│   ├── posts/                     # 게시글 모듈
│   │   ├── posts.module.ts
│   │   ├── posts.service.ts
│   │   ├── posts.controller.ts
│   │   ├── entities/
│   │   │   └── post.entity.ts
│   │   └── dto/
│   │       ├── create-post.dto.ts
│   │       └── update-post.dto.ts
│   │
│   ├── comments/                  # 댓글 모듈
│   │   ├── comments.module.ts
│   │   ├── comments.service.ts
│   │   ├── comments.controller.ts
│   │   ├── entities/
│   │   │   └── comment.entity.ts
│   │   └── dto/
│   │       ├── create-comment.dto.ts
│   │       └── update-comment.dto.ts
│   │
│   ├── stores/                    # 매장 검색 모듈
│   │   ├── stores.module.ts
│   │   ├── stores.service.ts
│   │   └── stores.controller.ts
│   │
│   └── admin/                     # 관리자 모듈 (옵션)
│       ├── admin.module.ts
│       ├── admin.service.ts
│       ├── admin.controller.ts
│       └── entities/
│           └── ingest-log.entity.ts
│
├── database/
│   └── init.sql                   # 데이터베이스 초기화 SQL
│
├── test/                          # 테스트 파일
│   └── app.e2e-spec.ts
│
├── .env                           # 환경 변수 (gitignore)
├── .env.example                   # 환경 변수 예시
├── package.json                   # 의존성 및 스크립트
├── tsconfig.json                  # TypeScript 설정
├── nest-cli.json                  # NestJS CLI 설정
├── 백엔드_작업_가이드.md          # 상세 개발 가이드
└── INSTALL.md                     # 이 파일
```

---

## 🔧 문제 해결

### 데이터베이스 연결 오류

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**해결 방법:**
1. PostgreSQL 서비스가 실행 중인지 확인
2. `.env` 파일의 데이터베이스 정보 확인
3. 방화벽 설정 확인

### 포트 충돌

```
Error: listen EADDRINUSE: address already in use :::3001
```

**해결 방법:**
1. 다른 프로세스가 포트를 사용 중인지 확인
2. `.env` 파일에서 `PORT` 변경

### JWT 오류

```
Error: secretOrPrivateKey must have a value
```

**해결 방법:**
1. `.env` 파일에 `JWT_SECRET`이 설정되어 있는지 확인
2. JWT_SECRET은 최소 32자 이상이어야 합니다

---

## 📚 다음 단계

설치가 완료되면 `백엔드_작업_가이드.md` 파일을 참고하여 모듈을 생성하고 API를 구현하세요.
