# 🍔 Hamburger-Collection (햄버거 모음 사이트)

**햄버거 브랜드별 메뉴/영양정보를 한 곳에서 탐색하고, 내 주변 매장까지 확인하며, 카카오 로그인 기반 게시판/댓글 커뮤니티를 제공하는 웹 서비스**

- 🌐 **프론트엔드 URL (Vercel)**: https://hamburger-collection.vercel.app
- 🌐 **백엔드 URL (Render)**: https://hamburger-collection-backend.onrender.com
- 📚 **API 문서**: https://hamburger-collection-backend.onrender.com/api

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
- 🔐 **카카오 소셜 로그인**: 간편한 로그인으로 게시판 및 즐겨찾기 기능 이용
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

### 2. 영양성분 정보 제공

- 주요 영양성분 표시 (칼로리, 단백질, 나트륨, 당류 등)
- 상세 영양성분 테이블 제공
- 메뉴 카드에 칼로리 정보 강조 표시

### 3. 내 주변 매장 검색

- 현재 위치 기반 매장 검색
- 카카오맵 연동으로 지도에 매장 위치 표시
- 매장 정보 제공 (이름, 주소, 거리, 전화번호, 카카오 플레이스 링크)
- 지도/리스트 뷰 전환 기능

### 4. 카카오 소셜 로그인

- OAuth 2.0 기반 카카오 로그인
- JWT 토큰 기반 인증 (AccessToken + RefreshToken)
- 자동 토큰 갱신 기능
- 프로필 정보 표시

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
- **Map**: Kakao Map JavaScript SDK
- **배포**: Vercel

### 백엔드

- **Framework**: NestJS 11.0.1
- **Language**: TypeScript 5.7.3
- **Database**: PostgreSQL (TypeORM 0.3.20)
- **Authentication**: Passport (JWT, Kakao OAuth)
- **API Documentation**: Swagger (@nestjs/swagger 11.2.5)
- **Validation**: class-validator, class-transformer
- **Web Scraping**: Cheerio, Puppeteer, Tesseract.js
- **HTTP Client**: Axios
- **배포**: Render

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
git clone <repository-url>
cd hamburger-collection
```

### 2. 백엔드 설정

```bash
cd backend
npm install
```

#### 환경 변수 설정 (`backend/.env`)

```env
# 개발 환경
NODE_ENV=development
PORT=3001

# 데이터베이스
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_DATABASE=hamburger_collection
DB_SSL=false

# 프론트엔드와 백엔드 서버
BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=14d

# 카카오 API
KAKAO_REST_KEY=your-kakao-rest-api-key
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_CLIENT_SECRET=your-kakao-client-secret
KAKAO_REDIRECT_URI=http://localhost:3000/auth/callback

# 쿠키 (프로덕션에서는 변경 필요)
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
COOKIE_DOMAIN=localhost
```

#### 데이터베이스 설정

1. PostgreSQL 데이터베이스 생성
2. `database/final.sql` 파일을 DBeaver 또는 psql로 실행

```bash
# DBeaver 사용 시
# 1. PostgreSQL 연결
# 2. hamburger_collection 데이터베이스 생성
# 3. database/final.sql 파일 실행
```

#### 개발 서버 실행

```bash
npm run start:dev
```

백엔드 서버는 `http://localhost:3001`에서 실행됩니다.

### 3. 프론트엔드 설정

```bash
cd frontend
npm install
```

#### 환경 변수 설정 (`frontend/.env.local`)

```env
# 백엔드 URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# 카카오맵 API 키
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
   - Web 플랫폼 추가: `http://localhost:3000`
4. **카카오 로그인 설정**
   - Redirect URI: `http://localhost:3000/auth/callback`
5. **API 키 발급**
   - REST API 키 (백엔드용)
   - JavaScript 키 (프론트엔드 카카오맵용)
   - Client ID, Client Secret (OAuth용)

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
│   ├── _components/          # 컴포넌트
│   │   ├── layout/           # 레이아웃 컴포넌트
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── MobileSidebar.tsx
│   │   └── ui/               # UI 컴포넌트
│   │       ├── MenuCard.tsx
│   │       ├── NutritionTable.tsx
│   │       └── Skeleton.tsx
│   ├── context/              # React Context
│   │   └── AuthContext.tsx
│   ├── hooks/                # 커스텀 훅
│   │   └── useAuth.ts
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
│   │   │   ├── guards/       # JWT 가드
│   │   │   └── strategies/  # Passport 전략
│   │   ├── users/            # 사용자 모듈
│   │   ├── brands/           # 브랜드 모듈
│   │   ├── menu-items/       # 메뉴 아이템 모듈
│   │   ├── nutrition/        # 영양정보 모듈
│   │   ├── posts/            # 게시글 모듈
│   │   ├── comments/         # 댓글 모듈
│   │   ├── stores/            # 매장 검색 모듈
│   │   ├── favorites/        # 즐겨찾기 모듈
│   │   └── admin/            # 관리자 모듈
│   │       └── scrapers/     # 웹 스크래퍼
│   ├── database/             # 데이터베이스 스크립트
│   │   └── final.sql
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
├── kakao_id (UNIQUE)
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
├── carbohydrate
├── protein
├── fat
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
- `AuthContext`의 `initAuth` 로직을 개선하여 토큰 갱신을 우선 시도

**참고**: `backend/src/auth/auth.controller.ts`, `frontend/app/context/AuthContext.tsx`

#### 2. 카카오 프로필 이미지 http/https 문제

**문제**: 카카오 API가 때때로 `http://` 프로토콜로 프로필 이미지 URL을 반환하여 Next.js Image 컴포넌트에서 에러 발생  
**해결**:
- `next.config.ts`에 `http://` 프로토콜 지원 추가 (`k.kakaocdn.net`)
- 백엔드에서 사용자 생성/업데이트 시 `http://` URL을 `https://`로 자동 변환

**참고**: `frontend/next.config.ts`, `backend/src/auth/auth.service.ts`

#### 3. 맘스터치 이미지 502 Bad Gateway 에러

**문제**: 배포 환경에서 맘스터치 메뉴 이미지가 502 에러로 표시되지 않음  
**원인**: `momstouch.co.kr` 서버가 Vercel의 Next.js Image Optimization 요청을 차단하거나 응답하지 않음  
**해결**:
- 맘스터치 이미지에 대해서만 일반 `img` 태그 사용 (Next.js Image Optimization 우회)
- 다른 브랜드 이미지는 계속 Next.js `Image` 컴포넌트 사용

**참고**: `frontend/_components/ui/MenuCard.tsx`, `frontend/app/brand/[slug]/menu/[id]/page.tsx`

#### 4. Vercel 배포 시 useSearchParams 에러

**문제**: Next.js 빌드 시 `useSearchParams() should be wrapped in a suspense boundary` 에러  
**해결**:
- `useSearchParams`를 사용하는 페이지를 `<Suspense>`로 감싸기
- 콜백 페이지에 `export const dynamic = "force-dynamic"` 설정

**참고**: `frontend/app/auth/callback/page.tsx`, `frontend/app/board/page.tsx`

#### 5. 타임존 문제 (UTC vs KST)

**문제**: DB의 `created_at`, `updated_at` 필드가 한국 시간(KST)보다 9시간 느리게 표시됨  
**원인**: PostgreSQL이 UTC로 저장하고, 프론트엔드에서 변환하지 않음  
**해결**:
- 백엔드/DB는 UTC 유지
- 프론트엔드에서 UTC 시간을 KST로 변환하는 유틸리티 함수 구현 (`utils/formatDate.ts`)
- 모든 날짜 표시에 변환 함수 적용

**참고**: `frontend/utils/formatDate.ts`

#### 6. Access Token 자동 갱신

**문제**: Access Token 만료 시 사용자가 재로그인해야 함  
**해결**:
- 401 에러 발생 시 Refresh Token으로 자동 갱신
- `AuthContext`에서 토큰 갱신 로직 구현
- 원래 요청 자동 재시도

**참고**: `frontend/app/context/AuthContext.tsx`, `frontend/lib/api.ts`

#### 7. Render 배포 시 nest 명령어 오류

**문제**: `sh: 1: nest: not found` 에러 발생  
**해결**:
- `package.json` 스크립트를 `npx nest build`, `npx nest start`로 변경
- `@nestjs/cli`를 `devDependencies`에서 `dependencies`로 이동

**참고**: `backend/package.json`

#### 8. TypeScript 타입 에러 (Vercel 빌드)

**문제**: Vercel 빌드 시 여러 TypeScript 타입 에러 발생  
**해결**:
- `post.author` 옵셔널 체이닝 추가
- 중복된 `className` 속성 병합
- `HeadersInit` 타입을 `Record<string, string>`로 명시적 캐스팅

**참고**: `frontend/app/board/[id]/edit/page.tsx`, `frontend/lib/api.ts`

### 💭 프로젝트 후기

#### 성과

- ✅ **7개 브랜드 통합**: 주요 햄버거 브랜드의 메뉴 정보를 한 곳에서 제공
- ✅ **반응형 디자인 완성**: 모바일부터 데스크탑까지 모든 환경에서 사용 가능
- ✅ **사용자 경험 개선**: 검색, 즐겨찾기, 게시판 등 다양한 기능 제공
- ✅ **안정적인 인증 시스템**: JWT 토큰 자동 갱신 및 크로스 도메인 쿠키 처리
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
        <img width="1849" height="585" alt="image" src="https://github.com/user-attachments/assets/9a16501b-7110-4489-9d87-1ef232d014c2" />
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
        <img width="1832" height="902" alt="image" src="https://github.com/user-attachments/assets/207df631-c04c-4c42-b5e8-b5121dfbb28d" />
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
