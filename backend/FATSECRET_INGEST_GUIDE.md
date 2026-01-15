# FatSecret 메뉴 수집 가이드

## 📋 개요

FatSecret 사이트에서 브랜드별 햄버거 메뉴와 영양정보를 자동으로 수집하여 데이터베이스에 저장하는 기능입니다.

---

## 🚀 사용 방법

### 1단계: 로그인

먼저 카카오 로그인을 통해 인증 토큰을 받아야 합니다:

```
http://localhost:3001/auth/kakao
```

### 2단계: 메뉴 수집 실행

로그인 후 다음 엔드포인트를 호출합니다:

```bash
POST http://localhost:3001/admin/ingest/:brandSlug/run
```

**예시:**
```bash
# 맥도날드 메뉴 수집
curl -X POST http://localhost:3001/admin/ingest/mcdonalds/run \
  -H "Cookie: accessToken=your_token"

# 버거킹 메뉴 수집
curl -X POST http://localhost:3001/admin/ingest/burgerking/run \
  -H "Cookie: accessToken=your_token"
```

### 3단계: 결과 확인

**성공 응답:**
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

---

## 📝 지원 브랜드

다음 브랜드 slug를 사용할 수 있습니다:

- `mcdonalds` - 맥도날드
- `burgerking` - 버거킹
- `lotte` - 롯데리아
- `momstouch` - 맘스터치
- `kfc` - KFC
- `nobrand` - 노브랜드버거
- `frank` - 프랭크버거

---

## 🔧 구현 세부사항

### 1. 스크래핑 프로세스

1. **검색 페이지 접근**
   - FatSecret 검색 URL로 브랜드 검색
   - 예: `https://www.fatsecret.kr/칼로리-영양소/맥도날드`

2. **메뉴 링크 추출**
   - 검색 결과에서 각 메뉴의 상세 페이지 링크 추출
   - 최대 50개까지 처리 (너무 많은 요청 방지)

3. **메뉴 상세 정보 수집**
   - 각 메뉴 상세 페이지에서:
     - 메뉴 이름
     - 카테고리 (버거/치킨/사이드/음료)
     - 이미지 URL
     - 영양정보 (칼로리, 단백질, 지방, 나트륨, 당류, 탄수화물)

4. **데이터베이스 저장**
   - 기존 메뉴가 있으면 업데이트
   - 새 메뉴면 생성
   - 영양정보도 함께 저장

### 2. 카테고리 자동 분류

메뉴 이름을 기반으로 카테고리를 자동으로 추정합니다:

- **burger**: "버거", "burger", "와퍼", "햄버거" 포함
- **chicken**: "치킨", "chicken", "닭" 포함
- **drink**: "음료", "drink", "콜라", "커피", "주스" 포함
- **side**: 위에 해당하지 않으면 기본값

### 3. 에러 처리

- 각 메뉴 수집 실패 시 에러 로그 기록
- 전체 실패해도 부분 성공한 메뉴는 저장
- IngestLog에 수집 결과 기록

---

## ⚠️ 주의사항

### 1. FatSecret 사이트 구조 변경

현재 구현은 FatSecret 사이트의 일반적인 구조를 가정합니다. 실제 사이트 구조가 다를 수 있으므로:

1. **셀렉터 수정 필요**
   - `scrapeMenuFromFatSecret` 메서드의 셀렉터를 실제 사이트 구조에 맞게 수정
   - 브라우저 개발자 도구로 실제 HTML 구조 확인

2. **테스트 후 조정**
   - 먼저 한 브랜드로 테스트
   - 콘솔 로그 확인
   - 필요시 셀렉터 수정

### 2. 요청 제한

- 각 메뉴 수집 사이에 0.5초 대기 (서버 부하 방지)
- 최대 50개 메뉴만 처리 (너무 많은 요청 방지)

### 3. 로그인 필요

- 관리자 기능이므로 JWT 인증 필요
- 로그인 후 쿠키에 `accessToken`이 있어야 함

---

## 🐛 문제 해결

### 문제 1: 메뉴가 수집되지 않음

**원인:** FatSecret 사이트 구조가 예상과 다름

**해결:**
1. 브라우저에서 FatSecret 사이트 접속
2. 개발자 도구로 HTML 구조 확인
3. `scrapeMenuFromFatSecret` 메서드의 셀렉터 수정

### 문제 2: 영양정보가 추출되지 않음

**원인:** 영양정보 테이블의 셀렉터가 맞지 않음

**해결:**
1. 메뉴 상세 페이지의 영양정보 테이블 구조 확인
2. 셀렉터 수정:
   ```typescript
   // 예시: 실제 사이트 구조에 맞게 수정
   $('table.nutritionTable tr').each((i, elem) => {
     // ...
   });
   ```

### 문제 3: 너무 많은 요청으로 차단됨

**해결:**
1. `delay` 시간 증가 (500ms → 1000ms)
2. 한 번에 수집하는 메뉴 수 줄이기 (50개 → 20개)

---

## 📊 수집 로그 확인

수집 실행 후 IngestLog를 확인할 수 있습니다:

```sql
SELECT * FROM ingest_logs 
ORDER BY fetched_at DESC 
LIMIT 10;
```

---

## 🔄 다음 단계

1. **실제 사이트 구조 확인**
   - FatSecret 사이트 접속
   - HTML 구조 분석
   - 셀렉터 수정

2. **테스트 실행**
   - 한 브랜드로 먼저 테스트
   - 결과 확인
   - 필요시 수정

3. **모든 브랜드 수집**
   - 각 브랜드별로 수집 실행
   - 데이터 확인

---

## 💡 팁

### 셀렉터 찾기

브라우저 개발자 도구에서:

1. **F12** 키로 개발자 도구 열기
2. **Elements** 탭에서 HTML 구조 확인
3. 원하는 요소에 **우클릭** → **Copy** → **Copy selector**

예시:
```javascript
// 복사한 셀렉터
$('.foodName').text() // 메뉴 이름
$('.nutritionTable tr').each(...) // 영양정보 테이블
```

---

이제 FatSecret에서 메뉴를 자동으로 수집할 수 있습니다! 🎉

**참고:** 실제 FatSecret 사이트 구조에 맞게 셀렉터를 수정해야 할 수 있습니다.
