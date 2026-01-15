# Postman 백엔드 API 테스트 가이드

## 📋 목차
1. [Postman 기본 설정](#1-postman-기본-설정)
2. [인증 (Auth) API](#2-인증-auth-api)
3. [브랜드 API](#3-브랜드-api)
4. [메뉴 API](#4-메뉴-api)
5. [게시판 API](#5-게시판-api)
6. [댓글 API](#6-댓글-api)
7. [매장 검색 API](#7-매장-검색-api)
8. [관리자 API](#8-관리자-api)
9. [쿠키 관리](#9-쿠키-관리)

---

## 1. Postman 기본 설정

### 1.1 환경 변수 설정

Postman에서 환경 변수를 설정하면 URL을 쉽게 관리할 수 있습니다.

1. **환경 생성**
   - 우측 상단의 환경 선택 드롭다운 클릭
   - "Add" 또는 "+" 클릭
   - 환경 이름: `Hamburger Backend`

2. **변수 추가**
   - 다음 변수들을 추가:
     ```
     base_url: http://localhost:3001
     access_token: (로그인 후 자동으로 설정됨)
     ```

3. **환경 선택**
   - 환경 드롭다운에서 "Hamburger Backend" 선택

### 1.2 요청 URL 작성

환경 변수를 사용하면:
```
{{base_url}}/brands
```

직접 입력하면:
```
http://localhost:3001/brands
```

---

## 2. 인증 (Auth) API

### 2.1 카카오 로그인 시작

**요청 설정:**
- **Method:** `GET`
- **URL:** `{{base_url}}/auth/kakao`
- **Headers:** 없음

**설명:**
- 카카오 로그인 페이지로 리다이렉트됩니다.
- 브라우저에서 직접 접속하는 것을 권장합니다.

**Postman에서 테스트:**
- Postman에서는 리다이렉트를 따라가기 어려우므로, 브라우저에서 실행하세요.

---

### 2.2 카카오 로그인 콜백 (브라우저에서 실행)

**브라우저에서:**
1. `http://localhost:3001/auth/kakao` 접속
2. 카카오 계정으로 로그인
3. 콜백 URL로 리다이렉트됨
4. JSON 응답에서 `accessToken` 복사

**응답 예시:**
```json
{
  "success": true,
  "message": "카카오 로그인 성공",
  "user": {
    "id": "uuid",
    "kakaoId": "123456789",
    "nickname": "사용자닉네임",
    "profileImage": "https://...",
    "role": "user"
  },
  "tokens": {
    "accessToken": "jwt_token_here",
    "refreshToken": "jwt_token_here"
  },
  "cookies": {
    "accessToken": "설정됨",
    "refreshToken": "설정됨"
  }
}
```

**중요:** `tokens.accessToken` 값을 복사하여 Postman 환경 변수에 저장하세요.

---

### 2.3 내 정보 조회

**요청 설정:**
- **Method:** `GET`
- **URL:** `{{base_url}}/auth/me`
- **Headers:**
  - `Cookie`: `accessToken={{access_token}}`
- **인증 필요:** ✅

**Postman 설정:**
1. **Headers 탭:**
   - Key: `Cookie`
   - Value: `accessToken=여기에_토큰_붙여넣기`

2. **또는 Authorization 탭:**
   - Type: `No Auth` (쿠키를 사용하므로)

**응답 예시:**
```json
{
  "id": "uuid",
  "kakaoId": "123456789",
  "nickname": "사용자닉네임",
  "profileImage": "https://...",
  "role": "user"
}
```

---

### 2.4 토큰 갱신

**요청 설정:**
- **Method:** `POST`
- **URL:** `{{base_url}}/auth/refresh`
- **Headers:**
  - `Cookie`: `refreshToken=여기에_refresh_token_붙여넣기`
- **인증 필요:** ✅ (refreshToken)

**Postman 설정:**
1. **Headers 탭:**
   - Key: `Cookie`
   - Value: `refreshToken=여기에_refresh_token_붙여넣기`

**응답 예시:**
```json
{
  "success": true
}
```

**참고:** 새로운 `accessToken`이 쿠키에 자동으로 설정됩니다.

---

### 2.5 로그아웃

**요청 설정:**
- **Method:** `POST`
- **URL:** `{{base_url}}/auth/logout`
- **Headers:** 없음 (쿠키 자동 삭제)

**응답 예시:**
```json
{
  "success": true
}
```

---

## 3. 브랜드 API

### 3.1 브랜드 목록 조회

**요청 설정:**
- **Method:** `GET`
- **URL:** `{{base_url}}/brands`
- **Headers:** 없음
- **인증 필요:** ❌

**응답 예시:**
```json
[
  {
    "id": "uuid",
    "slug": "mcdonalds",
    "name": "맥도날드",
    "logoUrl": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  ...
]
```

---

### 3.2 특정 브랜드 조회

**요청 설정:**
- **Method:** `GET`
- **URL:** `{{base_url}}/brands/:slug`
- **예시:** `{{base_url}}/brands/mcdonalds`
- **Headers:** 없음
- **인증 필요:** ❌

**Path Variables:**
- `slug`: 브랜드 slug (예: `mcdonalds`, `burgerking`)

**응답 예시:**
```json
{
  "id": "uuid",
  "slug": "mcdonalds",
  "name": "맥도날드",
  "logoUrl": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## 4. 메뉴 API

### 4.1 브랜드별 메뉴 목록 조회

**요청 설정:**
- **Method:** `GET`
- **URL:** `{{base_url}}/brands/:slug/menu-items`
- **예시:** `{{base_url}}/brands/mcdonalds/menu-items`
- **Query Params (선택):**
  - `category`: `burger`, `chicken`, `side`, `drink`
  - `sort`: `kcal_asc`, `kcal_desc`
  - `page`: `1` (기본값)
  - `limit`: `20` (기본값)
- **Headers:** 없음
- **인증 필요:** ❌

**Postman 설정:**
1. **Params 탭:**
   - Key: `category`, Value: `burger` (선택)
   - Key: `sort`, Value: `kcal_asc` (선택)
   - Key: `page`, Value: `1` (선택)
   - Key: `limit`, Value: `20` (선택)

**응답 예시:**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "빅맥",
      "category": "burger",
      "imageUrl": "https://...",
      "detailUrl": "https://...",
      "isActive": true,
      "nutrition": {
        "kcal": 563,
        "protein": 25.4,
        "fat": 33.6,
        "sodium": 1010
      }
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

### 4.2 메뉴 상세 조회

**요청 설정:**
- **Method:** `GET`
- **URL:** `{{base_url}}/menu-items/:id`
- **예시:** `{{base_url}}/menu-items/uuid-here`
- **Headers:** 없음
- **인증 필요:** ❌

**Path Variables:**
- `id`: 메뉴 ID (UUID)

**응답 예시:**
```json
{
  "id": "uuid",
  "name": "빅맥",
  "category": "burger",
  "imageUrl": "https://...",
  "detailUrl": "https://...",
  "isActive": true,
  "nutrition": {
    "id": "uuid",
    "kcal": 563,
    "protein": 25.4,
    "fat": 33.6,
    "sodium": 1010,
    "sugar": 7.0,
    "carbohydrate": 45.0
  },
  "brand": {
    "id": "uuid",
    "slug": "mcdonalds",
    "name": "맥도날드"
  }
}
```

---

## 5. 게시판 API

### 5.1 게시글 목록 조회

**요청 설정:**
- **Method:** `GET`
- **URL:** `{{base_url}}/posts`
- **Query Params (선택):**
  - `page`: `1` (기본값)
  - `limit`: `20` (기본값)
- **Headers:** 없음
- **인증 필요:** ❌

**응답 예시:**
```json
[
  {
    "id": "uuid",
    "title": "게시글 제목",
    "content": "게시글 내용",
    "viewCount": 10,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "user": {
      "id": "uuid",
      "nickname": "작성자닉네임"
    }
  }
]
```

---

### 5.2 게시글 상세 조회

**요청 설정:**
- **Method:** `GET`
- **URL:** `{{base_url}}/posts/:id`
- **예시:** `{{base_url}}/posts/uuid-here`
- **Headers:** 없음
- **인증 필요:** ❌

**응답 예시:**
```json
{
  "id": "uuid",
  "title": "게시글 제목",
  "content": "게시글 내용",
  "viewCount": 11,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "user": {
    "id": "uuid",
    "nickname": "작성자닉네임"
  },
  "comments": [
    {
      "id": "uuid",
      "content": "댓글 내용",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "user": {
        "id": "uuid",
        "nickname": "댓글작성자"
      }
    }
  ]
}
```

---

### 5.3 게시글 작성

**요청 설정:**
- **Method:** `POST`
- **URL:** `{{base_url}}/posts`
- **Headers:**
  - `Content-Type`: `application/json`
  - `Cookie`: `accessToken={{access_token}}`
- **Body (raw JSON):**
  ```json
  {
    "title": "게시글 제목",
    "content": "게시글 내용입니다."
  }
  ```
- **인증 필요:** ✅

**Postman 설정:**
1. **Body 탭:**
   - `raw` 선택
   - `JSON` 선택
   - 위의 JSON 입력

2. **Headers 탭:**
   - `Cookie`: `accessToken=여기에_토큰_붙여넣기`

**응답 예시:**
```json
{
  "id": "uuid",
  "title": "게시글 제목",
  "content": "게시글 내용입니다.",
  "viewCount": 0,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### 5.4 게시글 수정

**요청 설정:**
- **Method:** `PATCH`
- **URL:** `{{base_url}}/posts/:id`
- **예시:** `{{base_url}}/posts/uuid-here`
- **Headers:**
  - `Content-Type`: `application/json`
  - `Cookie`: `accessToken={{access_token}}`
- **Body (raw JSON):**
  ```json
  {
    "title": "수정된 제목",
    "content": "수정된 내용"
  }
  ```
- **인증 필요:** ✅ (작성자만)

**응답 예시:**
```json
{
  "id": "uuid",
  "title": "수정된 제목",
  "content": "수정된 내용",
  "updatedAt": "2024-01-01T01:00:00.000Z"
}
```

---

### 5.5 게시글 삭제

**요청 설정:**
- **Method:** `DELETE`
- **URL:** `{{base_url}}/posts/:id`
- **예시:** `{{base_url}}/posts/uuid-here`
- **Headers:**
  - `Cookie`: `accessToken={{access_token}}`
- **인증 필요:** ✅ (작성자만)

**응답 예시:**
```json
{
  "message": "게시글이 삭제되었습니다."
}
```

---

## 6. 댓글 API

### 6.1 댓글 목록 조회

**요청 설정:**
- **Method:** `GET`
- **URL:** `{{base_url}}/posts/:postId/comments`
- **예시:** `{{base_url}}/posts/uuid-here/comments`
- **Headers:** 없음
- **인증 필요:** ❌

**응답 예시:**
```json
[
  {
    "id": "uuid",
    "content": "댓글 내용",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "user": {
      "id": "uuid",
      "nickname": "댓글작성자"
    }
  }
]
```

---

### 6.2 댓글 작성

**요청 설정:**
- **Method:** `POST`
- **URL:** `{{base_url}}/posts/:postId/comments`
- **예시:** `{{base_url}}/posts/uuid-here/comments`
- **Headers:**
  - `Content-Type`: `application/json`
  - `Cookie`: `accessToken={{access_token}}`
- **Body (raw JSON):**
  ```json
  {
    "content": "댓글 내용입니다."
  }
  ```
- **인증 필요:** ✅

**응답 예시:**
```json
{
  "id": "uuid",
  "content": "댓글 내용입니다.",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### 6.3 댓글 수정

**요청 설정:**
- **Method:** `PATCH`
- **URL:** `{{base_url}}/posts/:postId/comments/:id`
- **예시:** `{{base_url}}/posts/post-uuid/comments/comment-uuid`
- **Headers:**
  - `Content-Type`: `application/json`
  - `Cookie`: `accessToken={{access_token}}`
- **Body (raw JSON):**
  ```json
  {
    "content": "수정된 댓글 내용"
  }
  ```
- **인증 필요:** ✅ (작성자만)

**응답 예시:**
```json
{
  "id": "uuid",
  "content": "수정된 댓글 내용",
  "updatedAt": "2024-01-01T01:00:00.000Z"
}
```

---

### 6.4 댓글 삭제

**요청 설정:**
- **Method:** `DELETE`
- **URL:** `{{base_url}}/posts/:postId/comments/:id`
- **예시:** `{{base_url}}/posts/post-uuid/comments/comment-uuid`
- **Headers:**
  - `Cookie`: `accessToken={{access_token}}`
- **인증 필요:** ✅ (작성자만)

**응답 예시:**
```json
{
  "message": "댓글이 삭제되었습니다."
}
```

---

## 7. 매장 검색 API

### 7.1 매장 검색

**요청 설정:**
- **Method:** `GET`
- **URL:** `{{base_url}}/stores/search`
- **Query Params:**
  - `brandSlug`: `mcdonalds` (필수)
  - `lat`: `37.5665` (필수) - 위도
  - `lng`: `126.9780` (필수) - 경도
  - `radius`: `5000` (선택, 기본값: 5000m)
- **Headers:** 없음
- **인증 필요:** ❌

**Postman 설정:**
1. **Params 탭:**
   - Key: `brandSlug`, Value: `mcdonalds`
   - Key: `lat`, Value: `37.5665` (서울시청 좌표)
   - Key: `lng`, Value: `126.9780`
   - Key: `radius`, Value: `5000` (선택)

**응답 예시:**
```json
[
  {
    "id": "1234567890",
    "place_name": "맥도날드 강남점",
    "address_name": "서울 강남구 ...",
    "road_address_name": "서울 강남구 ...",
    "phone": "02-1234-5678",
    "x": "126.9780",
    "y": "37.5665",
    "place_url": "https://place.map.kakao.com/...",
    "distance": "500m"
  }
]
```

---

## 8. 관리자 API

### 8.1 FatSecret 메뉴 수집 실행

**요청 설정:**
- **Method:** `POST`
- **URL:** `{{base_url}}/admin/ingest/:brandSlug/run`
- **예시:** `{{base_url}}/admin/ingest/mcdonalds/run`
- **Headers:**
  - `Cookie`: `accessToken={{access_token}}`
- **인증 필요:** ✅

**Path Variables:**
- `brandSlug`: 브랜드 slug (예: `mcdonalds`, `burgerking`)

**응답 예시:**
```json
{
  "success": true,
  "brand": "맥도날드",
  "totalProcessed": 50,
  "saved": 45,
  "errors": 5,
  "errorDetails": [...]
}
```

**참고:** 수집에는 시간이 걸릴 수 있습니다 (최대 50개 메뉴, 각 0.5초 대기).

---

## 9. 쿠키 관리

### 9.1 Postman에서 쿠키 설정 방법

#### 방법 1: Headers에 직접 입력

1. **Headers 탭:**
   - Key: `Cookie`
   - Value: `accessToken=여기에_토큰_붙여넣기`

2. **여러 쿠키 사용 시:**
   - Value: `accessToken=토큰1; refreshToken=토큰2`

#### 방법 2: Postman Cookie Manager 사용

1. **Cookies 탭:**
   - 요청 URL 옆의 "Cookies" 링크 클릭
   - 또는 우측 상단 "Cookies" 버튼 클릭

2. **쿠키 추가:**
   - Domain: `localhost`
   - Path: `/`
   - Name: `accessToken`
   - Value: `여기에_토큰_붙여넣기`
   - Save

3. **자동 사용:**
   - 쿠키가 자동으로 모든 요청에 포함됩니다.

#### 방법 3: 환경 변수 사용

1. **환경 변수에 토큰 저장:**
   - `access_token`: `여기에_토큰_붙여넣기`

2. **Headers에서 사용:**
   - Key: `Cookie`
   - Value: `accessToken={{access_token}}`

---

### 9.2 쿠키 자동 관리 (권장)

**Pre-request Script 사용:**

1. **요청 → Pre-request Script 탭:**
   ```javascript
   // 카카오 로그인 후 받은 토큰을 환경 변수에 저장
   pm.environment.set("access_token", "여기에_토큰_붙여넣기");
   ```

2. **Headers에서:**
   - Key: `Cookie`
   - Value: `accessToken={{access_token}}`

---

## 📝 Postman Collection 설정

### Collection 생성

1. **New → Collection**
2. **Collection 이름:** `Hamburger Backend API`
3. **Variables 탭:**
   - `base_url`: `http://localhost:3001`
   - `access_token`: (로그인 후 설정)

### 폴더 구조

```
Hamburger Backend API
├── Auth
│   ├── 카카오 로그인 (GET)
│   ├── 내 정보 조회 (GET)
│   ├── 토큰 갱신 (POST)
│   └── 로그아웃 (POST)
├── Brands
│   ├── 브랜드 목록 (GET)
│   └── 브랜드 상세 (GET)
├── Menu Items
│   ├── 메뉴 목록 (GET)
│   └── 메뉴 상세 (GET)
├── Posts
│   ├── 게시글 목록 (GET)
│   ├── 게시글 상세 (GET)
│   ├── 게시글 작성 (POST)
│   ├── 게시글 수정 (PATCH)
│   └── 게시글 삭제 (DELETE)
├── Comments
│   ├── 댓글 목록 (GET)
│   ├── 댓글 작성 (POST)
│   ├── 댓글 수정 (PATCH)
│   └── 댓글 삭제 (DELETE)
├── Stores
│   └── 매장 검색 (GET)
└── Admin
    └── 메뉴 수집 실행 (POST)
```

---

## 🚀 빠른 시작 가이드

### 1단계: 환경 설정

1. Postman 열기
2. 환경 생성: `Hamburger Backend`
3. 변수 추가:
   - `base_url`: `http://localhost:3001`
   - `access_token`: (비워두기)

### 2단계: 로그인

1. **브라우저에서:**
   ```
   http://localhost:3001/auth/kakao
   ```

2. **로그인 후 JSON 응답에서:**
   - `tokens.accessToken` 복사

3. **Postman 환경 변수에 저장:**
   - `access_token`: 복사한 토큰 붙여넣기

### 3단계: API 테스트

1. **브랜드 목록 조회:**
   - GET `{{base_url}}/brands`

2. **메뉴 목록 조회:**
   - GET `{{base_url}}/brands/mcdonalds/menu-items`

3. **내 정보 조회:**
   - GET `{{base_url}}/auth/me`
   - Headers: `Cookie: accessToken={{access_token}}`

---

## 💡 팁

### 1. 쿠키 자동 관리

**Pre-request Script:**
```javascript
// 모든 요청에 쿠키 자동 추가
const accessToken = pm.environment.get("access_token");
if (accessToken) {
  pm.request.headers.add({
    key: "Cookie",
    value: `accessToken=${accessToken}`
  });
}
```

### 2. 응답에서 토큰 자동 저장

**Tests 탭 (카카오 로그인 콜백 요청):**
```javascript
// 응답에서 토큰 추출하여 환경 변수에 저장
if (pm.response.code === 200) {
  const jsonData = pm.response.json();
  if (jsonData.tokens && jsonData.tokens.accessToken) {
    pm.environment.set("access_token", jsonData.tokens.accessToken);
    console.log("Access token saved!");
  }
}
```

### 3. 에러 처리

**Tests 탭:**
```javascript
// 상태 코드 확인
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

// 응답 시간 확인
pm.test("Response time is less than 500ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(500);
});
```

---

## ✅ 체크리스트

### 기본 설정
- [ ] Postman 설치
- [ ] 환경 변수 설정 (`base_url`, `access_token`)
- [ ] 서버 실행 확인 (`http://localhost:3001`)

### 인증 테스트
- [ ] 브라우저에서 카카오 로그인
- [ ] `accessToken` 복사
- [ ] Postman 환경 변수에 저장
- [ ] `/auth/me` 테스트 성공

### API 테스트
- [ ] 브랜드 목록 조회
- [ ] 메뉴 목록 조회
- [ ] 게시글 목록 조회
- [ ] 게시글 작성
- [ ] 댓글 작성
- [ ] 매장 검색

### 관리자 기능
- [ ] 메뉴 수집 실행
- [ ] 수집 결과 확인

---

이제 Postman으로 모든 API를 테스트할 수 있습니다! 🎉

**다음 단계:**
1. Postman Collection 생성
2. 각 엔드포인트 추가
3. 환경 변수 설정
4. 테스트 실행
