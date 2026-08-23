# Hamburger-Collection

여러 햄버거 브랜드의 메뉴, 이미지, 영양성분, 매장 정보를 한곳에서 확인하고 커뮤니티 기능까지 사용할 수 있는 풀스택 웹 서비스입니다.

- Frontend: Next.js App Router
- Backend: NestJS REST API
- Database: PostgreSQL, TypeORM
- Auth: Kakao OAuth + local login, JWT access token, httpOnly refresh token cookie
- Maps: Kakao Map JavaScript SDK, Kakao Local API

## 배포 URL

- Frontend: https://hamburger-collection.vercel.app
- Backend: https://hamburger-collection-backend-ypkw.onrender.com
- Swagger: https://hamburger-collection-backend-ypkw.onrender.com/api-docs

## 주요 기능

- 브랜드별 햄버거 메뉴 목록 및 상세 정보 조회
- 메뉴 이미지, 설명, 출처 링크, 영양성분 조회
- 칼로리 기준 오름차순/내림차순 정렬
- Kakao Local API 기반 브랜드별 주변 매장 검색
- Kakao Map 기반 매장 위치 표시
- Kakao OAuth 로그인 및 일반 회원가입/로그인
- refresh token hash 저장, token rotation, 로그아웃 시 refresh token 무효화
- 게시글/댓글 CRUD
- 즐겨찾기 메뉴 저장
- 관리자 전용 브랜드 메뉴 수집 API

## 지원 브랜드

- 맥도날드
- 버거킹
- 롯데리아
- 맘스터치
- KFC
- 노브랜드버거
- 프랭크버거

## 최근 반영된 주요 변경

- 관리자 메뉴 수집 API에 `admin` role 검사를 추가했습니다.
- 사용자 비밀번호와 refresh token hash는 기본 조회에서 제외되도록 정리했습니다.
- 게시글, 댓글, 사용자 공개 응답에서 필요한 공개 프로필 필드만 내려주도록 보강했습니다.
- 메뉴 목록의 페이지네이션 입력값을 검증하고, 영양성분 정렬을 DB 쿼리 기준으로 처리합니다.
- 각 브랜드 scraper가 현재 공식 페이지/API 구조에 맞게 메뉴 이미지, 설명, 영양성분을 갱신하도록 개선했습니다.
- 현재 공식 홈페이지에 없는 메뉴는 수집 성공 시 비활성화 처리합니다.
- KFC, 롯데리아, 노브랜드버거, 프랭크버거의 최근 메뉴 매칭 로직과 이미지 표시 문제를 보정했습니다.
- Next.js Image 최적화가 실패하는 일부 외부 이미지 도메인은 native `img` 렌더링으로 처리합니다.

## 기술 스택

### Frontend

- Next.js 16.1.2
- React 19.2.3
- TypeScript
- Tailwind CSS 4
- TanStack Query 5
- Zustand 5
- React Icons
- React Loading Skeleton

### Backend

- NestJS 11
- TypeScript
- TypeORM 0.3
- PostgreSQL
- Passport JWT, Passport Local
- Kakao OAuth
- Swagger
- Axios, Cheerio, Puppeteer, Tesseract.js

## 프로젝트 구조

```text
Hamburger-Collection/
├── frontend/
│   ├── app/
│   │   ├── auth/
│   │   ├── board/
│   │   ├── brand/
│   │   ├── favorites/
│   │   ├── guide/
│   │   └── mypage/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── providers/
│   ├── stores/
│   └── public/
├── backend/
│   ├── src/
│   │   ├── admin/
│   │   │   └── scrapers/
│   │   ├── auth/
│   │   ├── brands/
│   │   ├── comments/
│   │   ├── favorites/
│   │   ├── menu-items/
│   │   ├── nutrition/
│   │   ├── posts/
│   │   ├── stores/
│   │   └── users/
│   ├── database/
│   │   └── final.sql
│   └── test/
├── SUPABASE_UPTIMEROBOT_SETUP.md
└── README.md
```

## 로컬 실행

### 1. 저장소 클론

```bash
git clone https://github.com/xowls0315/Hamburger-Collection.git
cd Hamburger-Collection
```

### 2. 백엔드 설정

```bash
cd backend
npm install
```

`backend/.env` 예시:

```env
NODE_ENV=development
PORT=3001

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-password
DB_DATABASE=hamburger_collection
DB_SCHEMA=hamburger-collection
DB_SSL=false

BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

JWT_ACCESS_SECRET=your-jwt-access-secret-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-jwt-refresh-secret-min-32-chars
JWT_REFRESH_EXPIRES_IN=14d

KAKAO_REST_API_KEY=your-kakao-rest-api-key
KAKAO_REDIRECT_URI=http://localhost:3001/auth/kakao/callback
KAKAO_CLIENT_SECRET=your-kakao-client-secret
KAKAO_LOCAL_API_KEY=your-kakao-local-api-key
```

데이터베이스 초기화:

```bash
# PostgreSQL에 접속한 뒤 backend/database/final.sql 실행
```

개발 서버 실행:

```bash
npm run start:dev
```

- Backend: http://localhost:3001
- Swagger: http://localhost:3001/api-docs

### 3. 프론트엔드 설정

```bash
cd frontend
npm install
```

`frontend/.env.local` 예시:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_KAKAO_MAP_KEY=your-kakao-map-javascript-key
```

개발 서버 실행:

```bash
npm run dev
```

- Frontend: http://localhost:3000

## 관리자 메뉴 수집 API

관리자 권한 사용자는 Swagger 또는 API 클라이언트에서 아래 엔드포인트를 호출해 브랜드별 메뉴 데이터를 갱신할 수 있습니다.

```text
POST /admin/menu-items/mcdonalds/scrape
POST /admin/menu-items/burgerking/scrape
POST /admin/menu-items/lotteria/scrape
POST /admin/menu-items/momstouch/scrape
POST /admin/menu-items/kfc/scrape
POST /admin/menu-items/nobrand/scrape
POST /admin/menu-items/frank/scrape
```

주의사항:

- `JwtAuthGuard`와 `RolesGuard`가 적용되어 있어 로그인된 관리자만 호출할 수 있습니다.
- 공식 브랜드 페이지 구조가 바뀌면 scraper도 함께 수정해야 합니다.
- 수집 성공 시 현재 공식 페이지/API에 없는 기존 메뉴는 `isActive=false`로 비활성화됩니다.

## 주요 API

```text
GET  /brands
GET  /brands/:slug
GET  /brands/:slug/menu-items
GET  /menu-items/:id
GET  /stores/search
POST /auth/login
POST /auth/local/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
GET  /posts
POST /posts
GET  /posts/:id
POST /comments
GET  /favorites
POST /favorites/:menuItemId
```

## 데이터베이스 개요

주요 테이블:

- `brands`
- `menu_items`
- `nutrition`
- `users`
- `posts`
- `comments`
- `favorites`
- `ingest_logs`

`users.refresh_token_hash`는 refresh token rotation과 로그아웃 무효화를 위해 사용합니다.

## 빌드 및 테스트

백엔드:

```bash
cd backend
npm run build
npm run test
```

프론트엔드:

```bash
cd frontend
npm run build
```

프론트엔드 빌드는 `next/font`가 Google Fonts를 내려받아야 하므로 네트워크가 차단된 환경에서는 실패할 수 있습니다.

## 배포 메모

- Frontend는 Vercel 배포를 기준으로 합니다.
- Backend는 Render 배포를 기준으로 합니다.
- Database는 PostgreSQL 또는 Supabase PostgreSQL을 사용할 수 있습니다.
- Supabase와 Render 무료 플랜 운영 관련 내용은 `SUPABASE_UPTIMEROBOT_SETUP.md`를 참고하세요.
- 프로덕션 환경에서는 refresh token cookie가 `sameSite: none`, `secure: true`로 설정됩니다.

## 라이선스

개인 프로젝트입니다.
