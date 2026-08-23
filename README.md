# 🍔 Hamburger-Collection (햄버거 모음 사이트)

**햄버거 브랜드별 메뉴/영양정보를 한 곳에서 탐색하고, 내 주변 매장까지 확인하며, 카카오·일반 로그인 기반 게시판/댓글 커뮤니티를 제공하는 웹 서비스**

- 🌐 **프론트엔드 URL (Vercel)**: https://hamburger-collection.vercel.app
- 🌐 **백엔드 URL (Render)**: https://hamburger-collection-backend-ypkw.onrender.com
- 📚 **API 문서 (Swagger)**: https://hamburger-collection-backend-ypkw.onrender.com/api-docs

---

## 01. 프로젝트 소개 📋

### 한 줄 요약

맥도날드, 버거킹, 롯데리아, 맘스터치, KFC, 노브랜드버거, 프랭크버거 등 주요 햄버거 브랜드의 메뉴와 영양성분 정보를 한 곳에서 탐색하고, 내 주변 매장을 찾으며, 커뮤니티에서 소통할 수 있는 통합 웹 서비스입니다.

### 프로젝트의 목적 및 개요

다양한 햄버거 브랜드의 메뉴 정보를 각 브랜드 사이트를 방문하지 않고도 한 곳에서 쉽게 비교하고 탐색할 수 있도록 개발된 서비스입니다.
사용자는 브랜드별 메뉴를 검색하고, 영양성분을 확인하며, 내 주변 매장을 찾아 실제로 방문할 수 있습니다.

### 해결하고자 하는 문제

- 🔍 **여러 브랜드 사이트를 방문하지 않고** 한 곳에서 메뉴 비교
- 📊 **영양성분 정보를 쉽게 확인**하여 건강한 선택 지원
- 📍 **내 주변 매장을 빠르게 찾아** 실제 방문 가능
- 💬 **커뮤니티 기능**으로 다른 사용자들과 정보 공유
- ⭐ **즐겨찾기 기능**으로 자주 찾는 메뉴 관리

### 주요 특징 및 장점

- ✨ **7개 주요 브랜드 지원**: 맥도날드, 버거킹, 롯데리아, 맘스터치, KFC, 노브랜드버거, 프랭크버거
- 📱 **반응형 디자인**: 모바일, 태블릿, 데스크탑 모든 환경 지원
- 🔐 **이중 로그인**: 카카오 소셜 로그인 + 일반 회원가입/로그인(아이디·비밀번호·이메일), ID/PW 찾기·비밀번호 변경 지원
- 🗺️ **실시간 지도 표시**: 카카오맵 연동으로 매장 위치 시각적으로 확인
- 📊 **상세 영양성분 제공**: 칼로리, 단백질, 나트륨, 당류 등 상세 정보
- 🔄 **게스트/로그인 모드**: 로그인 없이도 메뉴 조회 가능, 로그인 시 추가 기능 이용
- ⭐ **즐겨찾기 기능**: 자주 찾는 메뉴를 저장하여 빠르게 접근

---

## 02. 프로젝트 주요 기능 🎯

### 1. 브랜드별 메뉴 탐색

- 7개 주요 햄버거 브랜드의 메뉴 목록 조회
- 브랜드별 메뉴 카테고리 분류 (버거, 치킨, 사이드, 음료)
- 메뉴 검색 기능 (디바운싱 적용)
- 메뉴 상세 정보 (이미지, 설명, 영양성분, 출처 링크)
- 칼로리 기준 오름차순/내림차순 정렬

### 2. 영양성분 정보 제공

- 주요 영양성분 표시 (칼로리, 단백질, 포화지방, 나트륨, 당류 등)
- 상세 영양성분 테이블 제공
- 메뉴 카드에 칼로리 정보 강조 표시

### 3. 내 주변 매장 검색

- 현재 위치 기반 매장 검색
- 카카오맵 연동으로 지도에 매장 위치 표시
- 매장 정보 제공 (이름, 주소, 거리, 전화번호, 카카오 플레이스 링크)
- 지도/리스트 뷰 전환 기능

### 4. 로그인 (카카오 + 일반 계정)

- **카카오 소셜 로그인**: OAuth 2.0 기반, JWT 토큰(AccessToken + RefreshToken), 자동 토큰 갱신
- **일반 계정**: 회원가입(아이디·비밀번호·이메일·닉네임), 로그인, ID 찾기(이메일), PW 찾기(임시 비밀번호 발급), 마이페이지에서 비밀번호 변경
- Refresh Token은 해시로 저장하고, 토큰 갱신 시 rotation 처리
- 마이페이지에서 카카오 계정 / 일반 계정 구분 표시

### 5. 게시판 및 댓글 기능

- 게스트: 게시글 목록/상세 조회만 가능
- 로그인 사용자: 게시글 CRUD (생성, 조회, 수정, 삭제)
- 댓글 CRUD 기능
- 작성자 본인만 수정/삭제 가능
- 조회수 기능

### 6. 즐겨찾기 기능

- 로그인 사용자만 이용 가능
- 메뉴 카드 및 상세 페이지에서 즐겨찾기 토글
- 즐겨찾기 목록 페이지에서 저장된 메뉴 조회

### 7. 가이드 페이지

- 프로젝트 소개 및 주요 기능 안내
- 브랜드별 트렌드 정보 제공

---

## 03. 프로젝트 기술 스택 🛠️

### 프론트엔드

- **Framework**: Next.js 16.1.2 (App Router)
- **Language**: TypeScript 5
- **UI Library**: React 19.2.3
- **Styling**: Tailwind CSS 4
- **Icons**: React Icons 5.5.0
- **Loading UI**: React Loading Skeleton 3.5.0
- **Global State**: Zustand 5 (인증·토큰 전역 관리)
- **Server State**: TanStack Query 5 (`@tanstack/react-query`, API 데이터 캐싱·무효화)
- **Map**: Kakao Map JavaScript SDK
- **배포**: Vercel

#### 프론트엔드 상태관리

| 종류 | 라이브러리 | 적용 범위 |
|------|-----------|----------|
| Global State | Zustand | 로그인 사용자, Access Token, 인증 액션 (`stores/authStore.ts`) |
| Server State | TanStack Query | 게시글, 댓글, 브랜드, 메뉴, 즐겨찾기, 매장 검색 (`hooks/queries/`) |
| Local State | `useState` | 검색어, 폼 입력, 댓글 작성 UI 등 컴포넌트 내부 상태 |
| URL State | Next.js Router | 게시판 페이지, 브랜드 정렬·페이지 쿼리 (`?page=`, `?sort=`) |

- 앱 루트는 `QueryProvider`로 감싸며, 마운트 시 `AuthInitializer`가 Zustand `initAuth()`를 호출합니다.
- 로그아웃 시 `clearUserQueries()`로 즐겨찾기 등 사용자 전용 쿼리 캐시를 정리합니다.

### 백엔드

- **Framework**: NestJS 11.0.1
- **Language**: TypeScript 5.7.3
- **Database**: PostgreSQL (TypeORM 0.3.20) — 로컬/Render PostgreSQL 또는 **Supabase** 사용 가능
- **Authentication**: Passport (JWT, Kakao OAuth, Local Strategy)
- **API Documentation**: Swagger (@nestjs/swagger 11.2.5)
- **Validation**: class-validator, class-transformer
- **Web Scraping**: Cheerio, Puppeteer, Tesseract.js
- **HTTP Client**: Axios
- **배포**: Render (Web Service) + Supabase(DB) + UptimeRobot(무료 sleep 방지) 조합 권장

### 외부 API

- **Kakao Local API**: 매장 검색
- **Kakao Map JavaScript SDK**: 지도 표시
- **Kakao OAuth 2.0**: 소셜 로그인

### 개발 도구

- **Package Manager**: npm
- **Version Control**: Git
- **Code Quality**: ESLint, Prettier

---

## 04. 프로젝트 설치 방법 📦

### 사전 요구사항

- Node.js 18.x 이상
- npm 또는 yarn
- PostgreSQL 데이터베이스 (로컬 또는 클라우드)
- 카카오 개발자 계정 및 API 키

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

#### 환경 변수 설정 (`backend/.env`)

코드에서 사용하는 변수명에 맞춰 설정하세요. `backend/.env.example`이 있으면 복사한 뒤 값을 채우면 됩니다.

```env
# 개발 환경
NODE_ENV=development
PORT=3001

# 데이터베이스
# 로컬 PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-password
DB_DATABASE=hamburger_collection
DB_SCHEMA=hamburger-collection
DB_SSL=false

# Supabase 사용 시: Project Settings → Database 에서 Host/Port/User/Password 확인
# DB_HOST=db.xxxx.supabase.co 또는 pooler 주소, DB_PORT=5432, DB_SSL=true
# 스키마를 hamburger-collection 으로 쓰는 경우 DB_SCHEMA=hamburger-collection

# Render PostgreSQL 사용 시: DB_HOST 등은 Render 대시보드에서 확인, DB_SSL=true

# 프론트엔드·백엔드 URL (CORS·로그인 콜백 리다이렉트용)
BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# JWT (JWT_ACCESS_SECRET / JWT_REFRESH_SECRET 각 32자 이상 권장)
JWT_ACCESS_SECRET=your-jwt-access-secret-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-jwt-refresh-secret-min-32-chars
JWT_REFRESH_EXPIRES_IN=14d

# 카카오 OAuth (로그인)
KAKAO_REST_API_KEY=your-kakao-rest-api-key
KAKAO_REDIRECT_URI=http://localhost:3001/auth/kakao/callback
KAKAO_CLIENT_SECRET=your-kakao-client-secret

# 카카오 로컬 API (매장 검색)
KAKAO_LOCAL_API_KEY=your-kakao-local-api-key
```

#### 데이터베이스 설정

1. **PostgreSQL** 준비: 로컬 PostgreSQL, Render PostgreSQL, 또는 **Supabase**(무료) 중 선택
2. **스키마·테이블 생성**: `backend/database/final.sql` 실행
   - **Supabase**: 대시보드 → SQL Editor에 `final.sql` 내용 붙여넣고 Run (스키마 `hamburger-collection` 생성)
   - **DBeaver**: PostgreSQL 연결 후 `final.sql` 실행 (스키마 사용 시 `DB_SCHEMA`와 동일하게 맞출 것)
3. **환경 변수**: 스키마를 `hamburger-collection`으로 쓴 경우 `DB_SCHEMA=hamburger-collection` 설정

**무료 배포 (Supabase + Render + UptimeRobot)** 로 DB 30일 만료·Web Service sleep을 피하려면 프로젝트 루트의 **`SUPABASE_UPTIMEROBOT_SETUP.md`** 를 참고하세요.

#### 개발 서버 실행

```bash
npm run start:dev
```

백엔드 서버는 `http://localhost:3001`에서 실행됩니다.
**API 문서 (Swagger)**: `http://localhost:3001/api-docs` — 관리자 권한 JWT 인증 후 메뉴 수집은 `POST /admin/menu-items/{mcdonalds|burgerking|lotteria|momstouch|kfc|nobrand|frank}/scrape` 호출.

### 3. 프론트엔드 설정

```bash
cd frontend
npm install
```

#### 환경 변수 설정 (`frontend/.env.local`)

프론트엔드 코드는 `NEXT_PUBLIC_API_URL`(백엔드 API 주소), `NEXT_PUBLIC_KAKAO_MAP_KEY`(카카오맵 JavaScript 키)를 사용합니다.

```env
# 백엔드 API URL (로컬: 3001, 배포 시 Render 백엔드 URL)
NEXT_PUBLIC_API_URL=http://localhost:3001

# 카카오맵 JavaScript 키 (카카오 개발자 콘솔 → 앱 키 → JavaScript 키)
NEXT_PUBLIC_KAKAO_MAP_KEY=your-kakao-map-javascript-key
```

#### 개발 서버 실행

```bash
npm run dev
```

프론트엔드 서버는 `http://localhost:3000`에서 실행됩니다.

### 4. 카카오 개발자 콘솔 설정

1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. 애플리케이션 생성
3. **플랫폼 설정**
   - Web 플랫폼 추가: `http://localhost:3000` (로컬), 배포 시 Vercel 도메인 추가
4. **카카오 로그인 설정**
   - Redirect URI: **백엔드** 콜백 URL 등록
     - 로컬: `http://localhost:3001/auth/kakao/callback`
     - 배포: `https://hamburger-collection-backend-ypkw.onrender.com/auth/kakao/callback`
5. **API 키**
   - REST API 키 → `KAKAO_REST_API_KEY`, 매장 검색용 → `KAKAO_LOCAL_API_KEY`
   - JavaScript 키 → 프론트 `NEXT_PUBLIC_KAKAO_MAP_KEY` (카카오맵)
   - Client Secret → `KAKAO_CLIENT_SECRET` (선택)

---

## 05. 기타 📚

### 📁 프로젝트 구조

```
hamburger-collection/
├── frontend/                 # Next.js 프론트엔드
│   ├── app/                  # App Router 페이지
│   │   ├── page.tsx          # 메인 페이지
│   │   ├── auth/             # 인증 관련
│   │   │   └── callback/     # 카카오 로그인 콜백
│   │   ├── brand/            # 브랜드 관련
│   │   │   └── [slug]/       # 브랜드별 메뉴
│   │   │       ├── page.tsx  # 메뉴 리스트
│   │   │       ├── menu/     # 메뉴 상세
│   │   │       └── stores/   # 매장 찾기
│   │   ├── board/            # 게시판
│   │   │   ├── page.tsx      # 게시글 목록
│   │   │   ├── new/          # 글 작성
│   │   │   └── [id]/         # 글 상세
│   │   ├── favorites/        # 즐겨찾기
│   │   ├── guide/            # 가이드 페이지
│   │   └── mypage/           # 마이페이지
│   ├── components/           # 컴포넌트
│   │   ├── layout/           # 레이아웃 컴포넌트
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── MobileSidebar.tsx
│   │   └── ui/               # UI 컴포넌트
│   │       ├── MenuCard.tsx
│   │       ├── NutritionTable.tsx
│   │       └── Skeleton.tsx
│   ├── stores/               # Zustand 전역 스토어
│   │   └── authStore.ts      # 인증·토큰 상태
│   ├── providers/            # React Provider
│   │   ├── QueryProvider.tsx # TanStack Query + Auth 초기화
│   │   └── AuthInitializer.tsx
│   ├── hooks/                # 커스텀 훅
│   │   ├── useAuth.ts        # Zustand 인증 훅
│   │   └── queries/          # TanStack Query 훅
│   │       ├── keys.ts
│   │       ├── usePosts.ts
│   │       ├── useComments.ts
│   │       ├── useBrands.ts
│   │       ├── useFavorites.ts
│   │       └── useStores.ts
│   ├── lib/                  # 라이브러리
│   │   └── api.ts            # API 클라이언트
│   ├── utils/                # 유틸리티 함수
│   │   └── formatDate.ts
│   ├── styles/               # 전역 스타일
│   │   └── globals.css
│   └── public/               # 정적 파일
│       ├── logo.png
│       └── [brand-logos]/
│
├── backend/                  # NestJS 백엔드
│   ├── src/
│   │   ├── auth/             # 인증 모듈
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── decorators/   # 권한 데코레이터
│   │   │   ├── guards/       # JWT/권한 가드
│   │   │   └── strategies/  # Passport 전략
│   │   ├── users/            # 사용자 모듈
│   │   │   └── dto/          # 공개 사용자 응답 DTO
│   │   ├── brands/           # 브랜드 모듈
│   │   ├── menu-items/       # 메뉴 아이템 모듈
│   │   ├── nutrition/        # 영양정보 모듈
│   │   ├── posts/            # 게시글 모듈
│   │   ├── comments/         # 댓글 모듈
│   │   ├── stores/            # 매장 검색 모듈
│   │   ├── favorites/        # 즐겨찾기 모듈
│   │   └── admin/            # 관리자 모듈 (브랜드별 메뉴 스크래핑 API)
│   │       └── scrapers/     # 웹 스크래퍼
│   ├── constants/            # 공통 상수 (예: DB 스키마명)
│   ├── database/             # 데이터베이스 스크립트
│   │   └── final.sql         # Supabase SQL Editor 또는 DBeaver에서 실행
│   └── test/                 # 테스트 파일
│
└── README.md                 # 프로젝트 문서
```

### 🗄️ 데이터베이스 ERD

```
brands (브랜드)
├── id (PK, UUID)
├── slug (UNIQUE)
├── name
├── logo_url
├── created_at
└── updated_at

users (사용자)
├── id (PK, UUID)
├── kakao_id (UNIQUE, nullable — 카카오 로그인 시만)
├── login_id (UNIQUE, nullable — 일반 회원가입 시)
├── password (nullable — bcrypt 해시)
├── refresh_token_hash (nullable — Refresh Token 해시)
├── email (nullable — ID/PW 찾기용)
├── nickname
├── profile_image
├── role
├── created_at
└── updated_at

menu_items (메뉴 아이템)
├── id (PK, UUID)
├── brand_id (FK → brands.id)
├── name
├── category
├── image_url
├── detail_url
├── description
├── is_active
├── created_at
└── updated_at

nutrition (영양정보)
├── id (PK, UUID)
├── menu_item_id (FK → menu_items.id, UNIQUE)
├── kcal
├── protein
├── saturatedFat (포화지방)
├── sodium
└── sugar

posts (게시글)
├── id (PK, UUID)
├── user_id (FK → users.id)
├── title
├── content
├── view_count
├── created_at
└── updated_at

comments (댓글)
├── id (PK, UUID)
├── post_id (FK → posts.id)
├── user_id (FK → users.id)
├── content
├── created_at
└── updated_at

favorites (즐겨찾기)
├── id (PK, UUID)
├── user_id (FK → users.id)
├── menu_item_id (FK → menu_items.id)
├── created_at
└── UNIQUE (user_id, menu_item_id)

ingest_logs (수집 로그)
├── id (PK, UUID)
├── brand_id (FK → brands.id)
├── status
├── changed_count
├── error
└── fetched_at
```

**관계**:

- `brands` : `menu_items` = 1 : N
- `menu_items` : `nutrition` = 1 : 1
- `users` : `posts` = 1 : N
- `users` : `comments` = 1 : N
- `users` : `favorites` = 1 : N
- `posts` : `comments` = 1 : N

### 🔧 프로젝트 과정 중 발생한 트러블슈팅

#### 1. 카카오 로그인 401 에러 (배포 환경)

**문제**: Vercel(프론트엔드)에서 Render(백엔드)로 카카오 로그인 시 `POST /auth/refresh 401 (Unauthorized)` 에러 발생
**원인**: `SameSite=Lax` 쿠키 정책으로 인해 크로스 도메인 POST 요청에서 쿠키가 전송되지 않음
**해결**:

- 프로덕션 환경에서 `refreshToken` 쿠키 설정을 `sameSite: 'none'`, `secure: true`로 변경
- CORS 설정에 `credentials: true` 및 필요한 HTTP 메서드/헤더 명시
- Zustand `authStore`의 `initAuth` 로직을 개선하여 토큰 갱신을 우선 시도

**참고**: `backend/src/auth/auth.controller.ts`, `frontend/stores/authStore.ts`

#### 2. 카카오 프로필 이미지 http/https 문제

**문제**: 카카오 API가 때때로 `http://` 프로토콜로 프로필 이미지 URL을 반환하여 Next.js Image 컴포넌트에서 에러 발생
**해결**:

- `next.config.ts`에 `http://` 프로토콜 지원 추가 (`k.kakaocdn.net`)
- 백엔드에서 사용자 생성/업데이트 시 `http://` URL을 `https://`로 자동 변환

**참고**: `frontend/next.config.ts`, `backend/src/auth/auth.service.ts`

#### 3. 맘스터치 이미지 502 Bad Gateway 에러

**문제**: 배포 환경에서 일부 브랜드 메뉴 이미지가 502 에러 또는 최적화 실패로 표시되지 않음
**원인**: `momstouch.co.kr`, `shinsegaefood.com` 등 일부 이미지 서버가 Vercel의 Next.js Image Optimization 요청을 차단하거나 응답하지 않음
**해결**:

- 맘스터치, 노브랜드버거 이미지에 대해서는 일반 `img` 태그 사용 (Next.js Image Optimization 우회)
- 다른 브랜드 이미지는 계속 Next.js `Image` 컴포넌트 사용

**참고**: `frontend/components/ui/MenuCard.tsx`, `frontend/app/brand/[slug]/menu/[id]/page.tsx`

#### 4. Vercel 배포 시 useSearchParams 에러

**문제**: Next.js 빌드 시 `useSearchParams() should be wrapped in a suspense boundary` 에러
**해결**:

- `useSearchParams`를 사용하는 페이지를 `<Suspense>`로 감싸기
- 콜백 페이지에 `export const dynamic = "force-dynamic"` 설정

**참고**: `frontend/app/auth/callback/page.tsx`, `frontend/app/board/page.tsx`

#### 5. Access Token 자동 갱신

**문제**: Access Token 만료 시 사용자가 재로그인해야 함
**해결**:

- 401 에러 발생 시 Refresh Token으로 자동 갱신
- Refresh Token은 DB에 평문 저장하지 않고 `refresh_token_hash`로 저장
- Refresh Token 재발급 시 새 토큰으로 rotation하고, 로그아웃 시 해시 제거
- `authStore` + `lib/api.ts`에서 토큰 갱신 및 원래 요청 자동 재시도
- `QueryProvider` / `AuthInitializer`에서 앱 시작 시 `initAuth()` 호출

**참고**: `frontend/stores/authStore.ts`, `frontend/providers/AuthInitializer.tsx`, `frontend/lib/api.ts`

#### 6. Render 배포 시 nest 명령어 오류

**문제**: `sh: 1: nest: not found` 에러 발생
**해결**:

- `package.json` 스크립트를 `npx nest build`, `npx nest start`로 변경
- `@nestjs/cli`를 `devDependencies`에서 `dependencies`로 이동

**참고**: `backend/package.json`

#### 7. TypeScript 타입 에러 (Vercel 빌드)

**문제**: Vercel 빌드 시 여러 TypeScript 타입 에러 발생
**해결**:

- `post.author` 옵셔널 체이닝 추가
- 중복된 `className` 속성 병합
- `HeadersInit` 타입을 `Record<string, string>`로 명시적 캐스팅

**참고**: `frontend/app/board/[id]/edit/page.tsx`, `frontend/lib/api.ts`

#### 8. 로컬/Supabase: fetch failed / uuid_generate_v4() / DBeaver에 데이터 안 보임

**문제**: 프론트엔드에서 `fetch failed` 발생, 백엔드 기동 시 `function uuid_generate_v4() does not exist` 로 DB 연결 실패, 또는 스크래핑 성공했는데 DBeaver의 `hamburger-collection.menu_items`에 데이터가 없음
**원인**:

- `fetch failed`: 백엔드가 3001에서 떠 있지 않음 (DB 에러로 기동 실패한 경우)
- `uuid_generate_v4()`: Supabase SQL Editor에서 `final.sql` 실행 시 `uuid-ossp` 확장이 없을 수 있음 → `final.sql`은 `gen_random_uuid()` 사용으로 수정됨
- **데이터가 다른 스키마에 쌓임**: Supabase pooler 사용 시 `search_path`가 적용되지 않아 `public` 스키마에 insert될 수 있음

**해결**:

- 백엔드 `.env`: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` 사용 (코드에서 `JWT_SECRET` 미사용)
- Render/Supabase PostgreSQL 사용 시: `DB_SSL=true` 설정
- 스키마 고정: 모든 엔티티에 `schema: 'hamburger-collection'` 명시 (`backend/src/constants/database.ts`, 각 `*.entity.ts`) → pooler 환경에서도 `hamburger-collection` 스키마에만 읽기/쓰기

**참고**: `backend/src/app.module.ts`, `backend/src/constants/database.ts`, `SUPABASE_UPTIMEROBOT_SETUP.md`

#### 9. 관리자 메뉴 수집 API 401 및 권한 처리

**문제**: `POST /admin/menu-items/{brand}/scrape` 호출 시 인증되지 않은 요청이나 일반 사용자 요청도 접근 가능한 구조가 될 수 있음
**해결**:

- 관리자 컨트롤러에 `JwtAuthGuard`와 `RolesGuard`를 함께 적용
- `@Roles('admin')` 데코레이터로 관리자 role 사용자만 브랜드별 메뉴 수집 API 호출 가능
- Swagger 또는 관리자 화면에서 메뉴 수집을 실행할 때는 관리자 계정의 Access Token 필요

**참고**: `backend/src/admin/admin.controller.ts`, `backend/src/auth/guards/roles.guard.ts`, `backend/src/auth/decorators/roles.decorator.ts`

#### 10. 브랜드 공식 페이지 변경으로 인한 메뉴/이미지/영양성분 매칭 실패

**문제**: KFC, 롯데리아, 노브랜드버거, 프랭크버거 등 일부 브랜드에서 공식 페이지 구조 또는 API 응답이 바뀌면서 신메뉴가 DB에 들어가지 않거나 이미지/영양성분이 누락됨
**해결**:

- KFC는 공식 메뉴 API를 우선 사용하고, 필요한 경우 기존 Puppeteer 수집 로직으로 fallback
- 롯데리아는 영양성분표의 `버거메뉴` 섹션을 기준으로 매칭하고, 일부 메뉴 이미지는 공식 이미지 URL fallback 적용
- 노브랜드버거와 프랭크버거는 현재 공식 홈페이지 메뉴 목록을 동적으로 읽어 DB에 반영
- 수집 성공 시 현재 공식 페이지/API에 없는 기존 메뉴는 `is_active=false`로 비활성화

**참고**: `backend/src/admin/scrapers/*-scraper.service.ts`, `backend/src/admin/scrapers/base-scraper.service.ts`

### 💭 프로젝트 후기

#### 성과

- ✅ **7개 브랜드 통합**: 주요 햄버거 브랜드의 메뉴 정보를 한 곳에서 제공
- ✅ **반응형 디자인 완성**: 모바일부터 데스크탑까지 모든 환경에서 사용 가능
- ✅ **사용자 경험 개선**: 검색, 즐겨찾기, 게시판 등 다양한 기능 제공
- ✅ **안정적인 인증 시스템**: Zustand 기반 JWT 토큰 자동 갱신 및 크로스 도메인 쿠키 처리
- ✅ **효율적인 데이터 페칭**: TanStack Query로 서버 상태 캐싱·무효화, 중복 요청 방지
- ✅ **실시간 매장 검색**: 카카오맵 연동으로 내 주변 매장을 쉽게 찾을 수 있음

#### 어려웠던 점

- **크로스 도메인 인증**: Vercel과 Render 간 쿠키 전송 문제로 인한 추가 개발 시간 소요
- **이미지 최적화**: 일부 브랜드 사이트의 이미지 서버 정책으로 인한 최적화 우회 필요
- **웹 스크래핑**: 각 브랜드 사이트의 구조가 달라 스크래퍼 개발에 시간 소요
- **타임존 처리**: UTC와 KST 변환 로직 구현 및 일관성 유지

#### 개선하고 싶은 부분

- 📊 **메뉴 비교 기능**: 여러 메뉴를 선택하여 영양성분 비교
- 🔍 **고급 검색 기능**: 가격대, 칼로리 범위, 브랜드별 필터링
- 📈 **통계 및 분석**: 인기 메뉴, 브랜드별 통계 제공
- 🌍 **리뷰 기능**: 사용자 리뷰 및 평점 시스템
- 🔔 **알림 기능**: 즐겨찾기 메뉴 할인 정보 알림
- 📱 **PWA 지원**: 모바일 앱처럼 사용 가능한 PWA 기능

---

## 06. 실행 화면 🖼️

<table>
  <tr>
    <th style="text-align:center;">메인 화면</th>
  </tr>
  <tr>
    <td align="center">
      <div style="background-color:#f5f5f5; padding:10px; border-radius:12px; display:inline-block;">
        <img width="1918" height="903" alt="image" src="https://github.com/user-attachments/assets/89f96d58-a478-4c1c-a123-e5c4f1403781" />
      </div>
    </td>
  </tr>
</table>

<table>
  <tr>
    <th style="text-align:center;">메뉴 상세 화면</th>
  </tr>
  <tr>
    <td align="center">
      <div style="background-color:#f5f5f5; padding:10px; border-radius:12px; display:inline-block;">
        <img width="1895" height="907" alt="image" src="https://github.com/user-attachments/assets/819845ba-4940-4de2-b7dc-a44b4d7f9c48" />
      </div>
    </td>
  </tr>
</table>

<table>
  <tr>
    <th style="text-align:center;">내 주변 매장 검색 화면</th>
  </tr>
  <tr>
    <td align="center">
      <div style="background-color:#f5f5f5; padding:10px; border-radius:12px; display:inline-block;">
        <img width="1837" height="901" alt="image" src="https://github.com/user-attachments/assets/b305080c-1768-4d90-a8f2-eb2c78e26c6f" />
      </div>
    </td>
  </tr>
</table>

<table>
  <tr>
    <th style="text-align:center;">게시판 화면</th>
  </tr>
  <tr>
    <td align="center">
      <div style="background-color:#f5f5f5; padding:10px; border-radius:12px; display:inline-block;">
        <img width="1840" height="785" alt="image" src="https://github.com/user-attachments/assets/56e45bb3-d976-4459-83dc-fe9ad82383b6" />
      </div>
    </td>
  </tr>
</table>

<table>
  <tr>
    <th style="text-align:center;">즐겨찾기 화면</th>
  </tr>
  <tr>
    <td align="center">
      <div style="background-color:#f5f5f5; padding:10px; border-radius:12px; display:inline-block;">
         <img width="1837" height="597" alt="image" src="https://github.com/user-attachments/assets/db7e03da-55e9-4503-aef1-6fc6156de87d" />
      </div>
    </td>
  </tr>
</table>

---

## 📄 라이선스

이 프로젝트는 개인 프로젝트입니다.

---

## 👤 개발자

<table width="100%" style="border-collapse: collapse; text-align: center;">
<thead>
<tr>
<th>Name</th>
<td width="100" align="center">황태진</td>
</tr>
<tr>
<th>Position</th>
<td width="300" align="center">
Full Stack Developer<br>
Frontend (Next.js)<br>
Backend (NestJS)<br>
DevOps (Vercel, Render)
</td>
</tr>
</thead>
</table>
