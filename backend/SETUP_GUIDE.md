# 백엔드 설정 완전 가이드

이 문서는 DBeaver와 PostgreSQL을 사용하여 백엔드를 처음부터 설정하는 방법을 단계별로 설명합니다.

---

## 📋 전체 작업 순서

1. [Node.js 및 PostgreSQL 설치 확인](#1-nodejs-및-postgresql-설치-확인)
2. [프로젝트 의존성 설치](#2-프로젝트-의존성-설치)
3. [DBeaver 설치 및 연결](#3-dbeaver-설치-및-연결)
4. [데이터베이스 생성](#4-데이터베이스-생성)
5. [테이블 생성 및 초기화](#5-테이블-생성-및-초기화)
6. [환경 변수 설정](#6-환경-변수-설정)
7. [애플리케이션 실행](#7-애플리케이션-실행)

---

## 1. Node.js 및 PostgreSQL 설치 확인

### Node.js 확인

```bash
node --version
# v18.x 이상이어야 합니다

npm --version
# 9.x 이상이어야 합니다
```

### PostgreSQL 확인

```bash
psql --version
# PostgreSQL 14.x 이상이어야 합니다
```

PostgreSQL이 설치되어 있지 않다면:
- [PostgreSQL 공식 사이트](https://www.postgresql.org/download/)에서 다운로드
- Windows: 설치 시 비밀번호를 반드시 기억하세요

---

## 2. 프로젝트 의존성 설치

```bash
cd backend
npm install
```

**설치되는 주요 패키지:**
- `@nestjs/typeorm`: TypeORM 통합
- `@nestjs/jwt`: JWT 토큰 처리
- `@nestjs/passport`: 인증 미들웨어
- `typeorm`: ORM 라이브러리
- `pg`: PostgreSQL 드라이버
- `cookie-parser`: 쿠키 파싱
- `axios`: HTTP 클라이언트
- `class-validator`: DTO 검증

---

## 3. DBeaver 설치 및 연결

### 3.1 DBeaver 설치

1. [DBeaver 공식 사이트](https://dbeaver.io/download/)에서 다운로드
2. Community Edition 설치 (무료)

### 3.2 PostgreSQL 연결 생성

1. **DBeaver 실행**
2. **새 연결 생성**
   - 상단 메뉴: `데이터베이스` → `새 데이터베이스 연결`
   - 또는 `Ctrl+Shift+D` 단축키
3. **PostgreSQL 선택**
4. **연결 정보 입력**:
   ```
   호스트: localhost
   포트: 5432
   데이터베이스: postgres (기본 데이터베이스)
   사용자명: postgres
   비밀번호: [PostgreSQL 설치 시 설정한 비밀번호]
   ```
5. **테스트 연결** 클릭
   - 성공 메시지가 나오면 연결 정보가 올바른 것입니다
6. **완료** 클릭

### 3.3 연결 확인

왼쪽 데이터베이스 탐색기에서 연결이 표시되는지 확인하세요.

---

## 4. 데이터베이스 생성

### 방법 1: DBeaver GUI 사용

1. 연결된 데이터베이스 우클릭
2. `새 데이터베이스 생성` 선택
3. 데이터베이스 이름: `hamburger_collection`
4. **생성** 클릭

### 방법 2: SQL 사용

1. 연결된 데이터베이스 우클릭 → `SQL 편집기` → `새 SQL 스크립트`
2. 다음 SQL 입력:

```sql
CREATE DATABASE hamburger_collection;
```

3. 실행: `Ctrl+Alt+X` 또는 실행 버튼 클릭

### 새 데이터베이스에 연결

1. `hamburger_collection` 데이터베이스 우클릭
2. `새 연결` 선택
3. 연결 정보는 동일하게 유지
4. 연결 완료

---

## 5. 테이블 생성 및 초기화

### 5.1 SQL 스크립트 실행

1. **SQL 편집기 열기**
   - `hamburger_collection` 데이터베이스 우클릭
   - `SQL 편집기` → `새 SQL 스크립트`
   - 또는 `Ctrl+\` 단축키

2. **SQL 파일 열기**
   - `파일` → `열기` → `database/init.sql` 선택
   - 또는 파일 내용을 복사하여 붙여넣기

3. **스크립트 실행**
   - 전체 선택: `Ctrl+A`
   - 실행: `Ctrl+Alt+X`
   - 또는 상단 실행 버튼 클릭

### 5.2 실행 결과 확인

하단 결과 탭에서:
- ✅ 성공 메시지 확인
- 에러가 있다면 에러 메시지 확인

### 5.3 테이블 확인

**방법 1: GUI 사용**
- 데이터베이스 → 스키마 → public → 테이블
- 다음 테이블들이 생성되어 있어야 합니다:
  - `brands`
  - `users`
  - `menu_items`
  - `nutrition`
  - `posts`
  - `comments`
  - `ingest_logs`

**방법 2: SQL 사용**

```sql
-- 테이블 목록 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 브랜드 데이터 확인
SELECT * FROM brands;
```

**예상 결과:**
- 7개의 브랜드 데이터가 있어야 합니다 (맥도날드, 버거킹, 롯데리아, 맘스터치, KFC, 노브랜드버거, 프랭크버거)

---

## 6. 환경 변수 설정

### 6.1 .env 파일 생성

```bash
cd backend
copy .env.example .env
```

또는 수동으로 `.env` 파일 생성

### 6.2 .env 파일 수정

`.env` 파일을 열어서 다음 값들을 수정하세요:

```env
# 데이터베이스 설정
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_actual_password  # ← 실제 비밀번호로 변경
DATABASE_NAME=hamburger_collection

# JWT 설정 (반드시 변경!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-characters  # ← 32자 이상으로 변경
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_EXPIRATION=7d

# 카카오 OAuth 설정 (나중에 설정)
KAKAO_REST_API_KEY=your_kakao_rest_api_key
KAKAO_REDIRECT_URI=http://localhost:3001/auth/kakao/callback
KAKAO_CLIENT_SECRET=your_kakao_client_secret

# 카카오 로컬 API 설정 (나중에 설정)
KAKAO_LOCAL_API_KEY=your_kakao_local_api_key

# 서버 설정
PORT=3001
NODE_ENV=development

# 프론트엔드 URL
FRONTEND_URL=http://localhost:3000
```

**중요:**
- `DATABASE_PASSWORD`: PostgreSQL 설치 시 설정한 비밀번호
- `JWT_SECRET`: 최소 32자 이상의 랜덤 문자열 (보안상 중요!)

---

## 7. 애플리케이션 실행

### 7.1 개발 모드 실행

```bash
cd backend
npm run start:dev
```

**성공 메시지:**
```
Application is running on: http://localhost:3001
```

### 7.2 연결 테스트

브라우저에서 접속:
```
http://localhost:3001
```

또는 API 테스트:
```bash
curl http://localhost:3001/brands
```

---

## 🔧 문제 해결

### 문제 1: 데이터베이스 연결 오류

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**해결 방법:**
1. PostgreSQL 서비스가 실행 중인지 확인
   - Windows: 서비스 관리자에서 `postgresql-x64-14` 확인
2. `.env` 파일의 데이터베이스 정보 확인
3. DBeaver에서 연결이 되는지 확인

### 문제 2: 포트 충돌

```
Error: listen EADDRINUSE: address already in use :::3001
```

**해결 방법:**
1. 다른 프로세스가 포트를 사용 중인지 확인
2. `.env` 파일에서 `PORT` 변경

### 문제 3: JWT 오류

```
Error: secretOrPrivateKey must have a value
```

**해결 방법:**
1. `.env` 파일에 `JWT_SECRET`이 설정되어 있는지 확인
2. JWT_SECRET은 최소 32자 이상이어야 합니다

### 문제 4: 테이블이 생성되지 않음

**해결 방법:**
1. SQL 스크립트 실행 시 에러 메시지 확인
2. `uuid-ossp` 확장 기능이 활성화되었는지 확인:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```
3. 권한 확인: `postgres` 사용자로 연결되어 있는지 확인

---

## 📚 다음 단계

설정이 완료되면:

1. **[백엔드_작업_가이드.md](./백엔드_작업_가이드.md)** 파일을 참고하여 모듈 생성
2. Entity 파일 생성
3. Service 및 Controller 구현
4. API 테스트

---

## 💡 유용한 DBeaver 팁

### SQL 편집기 단축키
- `Ctrl+Enter`: 선택한 쿼리 실행
- `Ctrl+Alt+X`: 전체 스크립트 실행
- `Ctrl+\`: 새 SQL 편집기 열기
- `Ctrl+Shift+F`: SQL 포맷팅
- `F5`: 쿼리 실행 계획 보기

### 데이터 확인
```sql
-- 모든 브랜드 조회
SELECT * FROM brands;

-- 특정 테이블의 레코드 수
SELECT COUNT(*) FROM menu_items;

-- 테이블 구조 확인
\d brands
```

### 데이터 삭제 (주의!)
```sql
-- 모든 데이터 삭제 (테스트용)
TRUNCATE TABLE comments, posts, nutrition, menu_items, users, ingest_logs CASCADE;

-- 테이블 삭제 후 재생성
DROP TABLE IF EXISTS comments, posts, nutrition, menu_items, users, ingest_logs, brands CASCADE;
-- 그 다음 init.sql 다시 실행
```

---

이제 백엔드 개발을 시작할 준비가 되었습니다! 🚀
