# 다음 단계 작업 가이드

백엔드 기본 구조가 완성되었습니다. 이제 다음 단계를 진행하세요.

---

## ✅ 완료된 작업

1. ✅ Entity 파일 생성 (User, Brand, MenuItem, Nutrition, Post, Comment, IngestLog)
2. ✅ Module 파일 생성
3. ✅ Service 및 Controller 파일 생성
4. ✅ DTO 파일 생성
5. ✅ Auth 관련 파일 생성 (JWT Strategy, Guards)
6. ✅ TypeORM 설정 완료 (.env 변수명에 맞춤)
7. ✅ AppModule에 모든 모듈 import

---

## 🔧 다음 단계

### 1. 패키지 설치 확인

```bash
cd backend
npm install
```

필요한 패키지가 모두 설치되어 있는지 확인하세요.

### 2. 서버 실행 및 테스트

```bash
npm run start:dev
```

서버가 정상적으로 실행되는지 확인하세요.

**예상 출력:**

```
Application is running on: http://localhost:3001
```

### 3. API 엔드포인트 테스트

#### 브랜드 조회

```bash
curl http://localhost:3001/brands
```

#### 특정 브랜드 조회

```bash
curl http://localhost:3001/brands/mcdonalds
```

#### 브랜드별 메뉴 조회

```bash
curl http://localhost:3001/brands/mcdonalds/menu-items
```

### 4. 카카오 OAuth 설정

1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. 애플리케이션 등록
3. 플랫폼 설정 → Web 플랫폼 추가
4. Redirect URI 등록: `http://localhost:3001/auth/kakao/callback`
5. REST API 키 및 Client Secret 발급
6. `.env` 파일에 키 입력:
   ```env
   KAKAO_REST_API_KEY=발급받은_키
   KAKAO_CLIENT_SECRET=발급받은_시크릿
   ```

### 5. 카카오 로컬 API 설정

1. 카카오 개발자 콘솔 → 제품 설정
2. 카카오 로컬 API 활성화
3. `.env` 파일에 키 입력:
   ```env
   KAKAO_LOCAL_API_KEY=발급받은_키
   ```

### 6. 데이터베이스 연결 확인

DBeaver에서:

1. `hamburger_collection` 데이터베이스 연결 확인
2. 테이블이 정상적으로 생성되었는지 확인:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```
3. 브랜드 데이터 확인:
   ```sql
   SELECT * FROM brands;
   ```

### 7. 메뉴 데이터 추가 (옵션)

현재는 브랜드만 있고 메뉴 데이터가 없습니다. 테스트를 위해 수동으로 메뉴 데이터를 추가할 수 있습니다:

```sql
-- 예시: 맥도날드 메뉴 추가
INSERT INTO menu_items (brand_id, name, category, image_url, detail_url, is_active)
SELECT
    id,
    '빅맥',
    'burger',
    'https://example.com/bigmac.jpg',
    'https://www.mcdonalds.co.kr/kor/menu/list.do',
    true
FROM brands
WHERE slug = 'mcdonalds'
LIMIT 1;

-- 영양정보 추가
INSERT INTO nutrition (menu_item_id, kcal, protein, sodium)
SELECT
    id,
    563,
    25.4,
    1010
FROM menu_items
WHERE name = '빅맥'
LIMIT 1;
```

### 8. 프론트엔드 연동

프론트엔드에서 API를 호출할 때:

- Base URL: `http://localhost:3001`
- CORS 설정이 되어 있으므로 `http://localhost:3000`에서 호출 가능

**예시:**

```typescript
// 프론트엔드에서
const response = await fetch('http://localhost:3001/brands');
const brands = await response.json();
```

---

## 🐛 문제 해결

### 데이터베이스 연결 오류

**에러:** `connect ECONNREFUSED`

**해결:**

1. `.env` 파일의 데이터베이스 정보 확인
2. DBeaver에서 연결이 되는지 확인
3. Render PostgreSQL의 경우 SSL 설정 확인

### JWT 오류

**에러:** `secretOrPrivateKey must have a value`

**해결:**

1. `.env` 파일에 `JWT_ACCESS_SECRET`과 `JWT_REFRESH_SECRET`이 설정되어 있는지 확인
2. 최소 32자 이상의 랜덤 문자열 사용

### TypeORM Entity 오류

**에러:** `Entity metadata not found`

**해결:**

1. Entity 파일이 올바른 경로에 있는지 확인
2. `app.module.ts`에 TypeORM 설정이 올바른지 확인
3. Entity 클래스에 `@Entity()` 데코레이터가 있는지 확인

---

## 📝 추가 개발 사항

### 1. 에러 처리 개선

- Global Exception Filter 추가
- 커스텀 예외 클래스 생성

### 2. 로깅

- Winston 또는 NestJS Logger 활용
- 요청/응답 로깅

### 3. 검증 강화

- DTO Validation 추가
- 비즈니스 로직 검증

### 4. 성능 최적화

- 쿼리 최적화
- 캐싱 추가 (Redis 등)

### 5. 테스트

- Unit Test 작성
- E2E Test 작성

---

## 🚀 배포 준비

### Render 배포 시

1. **환경 변수 설정**
   - Render 대시보드에서 모든 환경 변수 설정
   - `DB_HOST`, `DB_PORT` 등 Render PostgreSQL 정보 입력

2. **빌드 설정**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start:prod`

3. **데이터베이스 마이그레이션**
   - Render PostgreSQL에 `init.sql` 실행
   - 또는 TypeORM synchronize 사용 (개발 환경만)

---

이제 백엔드 개발을 시작할 수 있습니다! 🎉
