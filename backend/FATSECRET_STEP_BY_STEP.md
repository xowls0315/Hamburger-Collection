# FatSecret 메뉴 수집 단계별 가이드

## 📋 전체 과정 개요

FatSecret에서 브랜드별 메뉴 데이터를 수집하는 전체 과정을 단계별로 설명합니다.

---

## 🎯 1단계: 사이트 구조 확인 (완료)

### 확인된 구조

**검색 결과 페이지:**
- URL: `https://www.fatsecret.kr/칼로리-영양소/search?q=맥도날드`
- 메뉴 링크: `<tr>` 안에 `<a class="prominent">` 태그
- 셀렉터: `tr td a.prominent`

**메뉴 상세 페이지:**
- URL: `https://www.fatsecret.kr/칼로리-영양소/맥도날드-(mcdonalds)/빅맥/1개`
- 메뉴 이름: `<h1>` 태그
- 영양정보: `<table>` 안의 `<tr>` 태그들

---

## 🔧 2단계: 코드 수정 (완료)

코드가 실제 FatSecret 구조에 맞게 수정되었습니다:

1. ✅ 검색 URL 형식 수정
2. ✅ 메뉴 링크 추출 셀렉터 수정 (`tr td a.prominent`)
3. ✅ 메뉴 이름 추출 (h1 태그)
4. ✅ 영양정보 추출 (테이블 행)

---

## 🚀 3단계: 실제 수집 실행

### 3.1 서버 실행

```bash
cd backend
npm run start:dev
```

**예상 출력:**
```
Application is running on: http://localhost:3001
```

### 3.2 카카오 로그인

1. **브라우저에서 접속:**
   ```
   http://localhost:3001/auth/kakao
   ```

2. **카카오 계정으로 로그인**

3. **쿠키 확인:**
   - 개발자 도구 (F12) → Application 탭 → Cookies
   - `accessToken` 쿠키 확인

### 3.3 메뉴 수집 실행

#### 방법 1: curl 사용

```bash
# 맥도날드 메뉴 수집
curl -X POST http://localhost:3001/admin/ingest/mcdonalds/run \
  -H "Cookie: accessToken=your_access_token_here"
```

#### 방법 2: Postman 사용

1. **Postman 열기**
2. **새 요청 생성**
   - Method: `POST`
   - URL: `http://localhost:3001/admin/ingest/mcdonalds/run`
3. **Headers 추가:**
   - Key: `Cookie`
   - Value: `accessToken=your_access_token_here`
4. **Send 클릭**

#### 방법 3: 브라우저 확장 프로그램

- "ModHeader" 또는 "Cookie Editor" 확장 프로그램 사용
- 쿠키에 `accessToken` 추가
- POST 요청 실행

### 3.4 콘솔 로그 확인

서버 터미널에서 다음 로그를 확인하세요:

```
🔍 검색 URL: https://www.fatsecret.kr/칼로리-영양소/search?q=맥도날드
📄 페이지 제목: ...
🔗 링크 개수: ...
✅ 발견된 메뉴 링크: XX개

[1/50] 처리 중: https://www.fatsecret.kr/...
  ✅ 생성: 빅맥
[2/50] 처리 중: https://www.fatsecret.kr/...
  ✅ 생성: 맥스파이시 상하이 버거
...

📊 수집 완료: 저장 XX개, 에러 X개
```

---

## 📊 4단계: 결과 확인

### 4.1 API로 확인

```bash
# 브랜드별 메뉴 목록
curl http://localhost:3001/brands/mcdonalds/menu-items

# 메뉴 상세 (menu-item-id는 실제 ID로 변경)
curl http://localhost:3001/menu-items/{menu-item-id}
```

### 4.2 DBeaver에서 확인

```sql
-- 맥도날드 메뉴 개수 확인
SELECT COUNT(*) 
FROM menu_items mi
JOIN brands b ON mi.brand_id = b.id
WHERE b.slug = 'mcdonalds';

-- 메뉴와 영양정보 조회
SELECT 
    mi.name,
    mi.category,
    n.kcal,
    n.protein,
    n.fat,
    n.sodium
FROM menu_items mi
JOIN brands b ON mi.brand_id = b.id
LEFT JOIN nutrition n ON mi.id = n.menu_item_id
WHERE b.slug = 'mcdonalds'
ORDER BY mi.name;
```

### 4.3 수집 로그 확인

```sql
-- 최근 수집 로그 확인
SELECT 
    il.status,
    il.changed_count,
    il.error,
    il.fetched_at,
    b.name as brand_name
FROM ingest_logs il
JOIN brands b ON il.brand_id = b.id
ORDER BY il.fetched_at DESC
LIMIT 10;
```

---

## 🔍 5단계: 문제 해결

### 문제 1: 메뉴 링크가 0개

**확인 사항:**
1. 콘솔 로그에서 "발견된 메뉴 링크: 0개" 확인
2. "⚠️ 메뉴 링크를 찾을 수 없습니다" 메시지 확인
3. 콘솔에 출력된 링크 목록 확인

**해결 방법:**
1. 브라우저에서 검색 페이지 직접 접속
2. 개발자 도구로 실제 HTML 구조 확인
3. `admin.service.ts`의 셀렉터 수정:
   ```typescript
   // 현재
   $('tr td a.prominent').each(...)
   
   // 만약 구조가 다르다면
   $('a.prominent').each(...)
   // 또는
   $('table tr a[href*="/칼로리-영양소/"]').each(...)
   ```

### 문제 2: 메뉴 이름이 추출되지 않음

**확인 사항:**
- 콘솔 로그에서 "⚠️ 메뉴 이름을 찾을 수 없습니다" 확인

**해결 방법:**
1. 메뉴 상세 페이지 직접 접속
2. 개발자 도구로 h1 태그 확인
3. 셀렉터 수정:
   ```typescript
   // 여러 방법 시도
   name = $('h1.food-title').text().trim() ||
          $('h1').first().text().trim() ||
          $('title').text().split('|')[0].trim();
   ```

### 문제 3: 영양정보가 추출되지 않음

**확인 사항:**
- 콘솔 로그에서 영양정보가 null인지 확인
- DBeaver에서 nutrition 테이블 확인

**해결 방법:**
1. 메뉴 상세 페이지에서 영양정보 테이블 구조 확인
2. 개발자 도구로 테이블 HTML 확인
3. 셀렉터 수정:
   ```typescript
   // 테이블 구조에 맞게 수정
   $('table.nutrition tr').each(...)
   // 또는
   $('table.facts tr').each(...)
   ```

### 문제 4: 인증 에러

**에러:** `401 Unauthorized`

**해결:**
1. 카카오 로그인 다시 실행
2. 쿠키에서 `accessToken` 확인
3. 요청 헤더에 쿠키 포함 확인

---

## 📝 6단계: 모든 브랜드 수집

각 브랜드별로 수집을 실행하세요:

```bash
# 맥도날드
curl -X POST http://localhost:3001/admin/ingest/mcdonalds/run \
  -H "Cookie: accessToken=your_token"

# 버거킹
curl -X POST http://localhost:3001/admin/ingest/burgerking/run \
  -H "Cookie: accessToken=your_token"

# 롯데리아
curl -X POST http://localhost:3001/admin/ingest/lotte/run \
  -H "Cookie: accessToken=your_token"

# 맘스터치
curl -X POST http://localhost:3001/admin/ingest/momstouch/run \
  -H "Cookie: accessToken=your_token"

# KFC
curl -X POST http://localhost:3001/admin/ingest/kfc/run \
  -H "Cookie: accessToken=your_token"

# 노브랜드버거
curl -X POST http://localhost:3001/admin/ingest/nobrand/run \
  -H "Cookie: accessToken=your_token"

# 프랭크버거
curl -X POST http://localhost:3001/admin/ingest/frank/run \
  -H "Cookie: accessToken=your_token"
```

---

## ✅ 체크리스트

### 준비 단계
- [ ] 서버 실행 (`npm run start:dev`)
- [ ] 카카오 로그인 완료
- [ ] `accessToken` 쿠키 확인

### 수집 실행
- [ ] 한 브랜드로 테스트 (맥도날드 추천)
- [ ] 콘솔 로그 확인
- [ ] 메뉴 링크가 정상적으로 추출되는지 확인
- [ ] 메뉴 데이터가 정상적으로 저장되는지 확인

### 데이터 확인
- [ ] API로 메뉴 목록 조회
- [ ] DBeaver에서 데이터 확인
- [ ] 영양정보가 정상적으로 저장되었는지 확인

### 문제 해결 (필요시)
- [ ] 셀렉터 수정 (문제가 있는 경우)
- [ ] 재테스트

### 전체 수집
- [ ] 모든 브랜드 수집 실행
- [ ] 수집 로그 확인
- [ ] 최종 데이터 확인

---

## 🎯 빠른 시작

### 1. 서버 실행 및 로그인

```bash
# 터미널 1: 서버 실행
cd backend
npm run start:dev

# 브라우저: 로그인
http://localhost:3001/auth/kakao
```

### 2. 쿠키 확인

브라우저 개발자 도구 (F12) → Application → Cookies → `accessToken` 복사

### 3. 수집 실행

```bash
# 터미널 2: 수집 실행
curl -X POST http://localhost:3001/admin/ingest/mcdonalds/run \
  -H "Cookie: accessToken=복사한_토큰"
```

### 4. 결과 확인

```bash
# 메뉴 목록 확인
curl http://localhost:3001/brands/mcdonalds/menu-items
```

---

## 💡 팁

### 1. 점진적 테스트

- 먼저 한 브랜드로 테스트
- 문제가 없으면 다른 브랜드도 실행

### 2. 로그 모니터링

- 서버 콘솔을 계속 확인
- 에러 메시지 즉시 확인

### 3. 데이터 검증

- 수집 후 반드시 데이터 확인
- 영양정보가 누락되지 않았는지 확인

### 4. 재수집

- 데이터가 잘못 수집되었으면 다시 실행 가능
- 기존 메뉴는 업데이트됨

---

이제 실제로 메뉴를 수집할 수 있습니다! 🎉

**다음 순서:**
1. 서버 실행
2. 로그인
3. 한 브랜드로 테스트
4. 결과 확인
5. 모든 브랜드 수집
