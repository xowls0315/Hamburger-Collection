# FatSecret 셀렉터 수정 가이드

## 📋 목차
1. [사이트 구조 확인 방법](#1-사이트-구조-확인-방법)
2. [셀렉터 찾기](#2-셀렉터-찾기)
3. [코드 수정](#3-코드-수정)
4. [테스트 및 디버깅](#4-테스트-및-디버깅)

---

## 1. 사이트 구조 확인 방법

### 1.1 브라우저에서 사이트 접속

1. **Chrome 또는 Edge 브라우저 열기**

2. **FatSecret 검색 페이지 접속**
   ```
   https://www.fatsecret.kr/칼로리-영양소/맥도날드
   ```

3. **개발자 도구 열기**
   - **F12** 키 누르기
   - 또는 **우클릭** → **검사** (Inspect)

### 1.2 Elements 탭에서 HTML 구조 확인

개발자 도구의 **Elements** (또는 **요소**) 탭에서:

1. **메뉴 목록 찾기**
   - 검색 결과에서 메뉴들이 어떻게 표시되는지 확인
   - 각 메뉴 항목의 HTML 구조 확인

2. **메뉴 상세 페이지 확인**
   - 메뉴 하나를 클릭하여 상세 페이지로 이동
   - 상세 페이지의 HTML 구조 확인

---

## 2. 셀렉터 찾기

### 2.1 메뉴 링크 셀렉터 찾기

**검색 결과 페이지에서:**

1. **메뉴 항목에 마우스 오버**
   - 메뉴 항목에 마우스를 올리면 하이라이트됨

2. **우클릭 → 검사**
   - 해당 요소의 HTML이 Elements 탭에 표시됨

3. **HTML 구조 확인**
   ```html
   <!-- 예시 1: 링크가 <a> 태그에 있는 경우 -->
   <a href="/칼로리-영양소/맥도날드/빅맥" class="food-link">
     빅맥
   </a>

   <!-- 예시 2: 링크가 다른 구조인 경우 -->
   <div class="food-item">
     <a href="/칼로리-영양소/맥도날드/빅맥">빅맥</a>
   </div>
   ```

4. **셀렉터 복사**
   - 요소에 **우클릭** → **Copy** → **Copy selector**
   - 또는 수동으로 셀렉터 작성

**일반적인 셀렉터 패턴:**
```javascript
// 패턴 1: 클래스 기반
$('a.food-link')
$('.food-item a')
$('[class*="food"] a')

// 패턴 2: href 패턴 기반
$('a[href*="/칼로리-영양소/"]')
$('a[href*="/칼로리"]')

// 패턴 3: 부모 요소 기반
$('.search-results a')
$('#food-list a')
```

### 2.2 메뉴 이름 셀렉터 찾기

**메뉴 상세 페이지에서:**

1. **메뉴 이름 부분에 마우스 오버**
2. **우클릭 → 검사**
3. **HTML 구조 확인**
   ```html
   <!-- 예시 1 -->
   <h1 class="food-name">빅맥</h1>

   <!-- 예시 2 -->
   <div class="food-title">
     <h1>빅맥</h1>
   </div>

   <!-- 예시 3 -->
   <h1>빅맥</h1>
   ```

**셀렉터 예시:**
```javascript
// 패턴 1: 클래스 기반
$('h1.food-name').text()
$('.food-title h1').text()

// 패턴 2: 태그 기반
$('h1').first().text()
$('h1').eq(0).text()

// 패턴 3: ID 기반
$('#food-name').text()
```

### 2.3 이미지 URL 셀렉터 찾기

**메뉴 상세 페이지에서:**

1. **이미지에 마우스 오버**
2. **우클릭 → 검사**
3. **HTML 구조 확인**
   ```html
   <!-- 예시 1 -->
   <img src="https://..." class="food-image" alt="빅맥">

   <!-- 예시 2 -->
   <div class="food-image-container">
     <img src="https://...">
   </div>
   ```

**셀렉터 예시:**
```javascript
// 패턴 1: 클래스 기반
$('img.food-image').attr('src')
$('.food-image img').attr('src')

// 패턴 2: alt 속성 기반
$('img[alt*="빅맥"]').attr('src')

// 패턴 3: 첫 번째 이미지
$('img').first().attr('src')
```

### 2.4 영양정보 셀렉터 찾기

**메뉴 상세 페이지에서:**

1. **영양정보 테이블 찾기**
   - "칼로리", "단백질", "지방" 등의 텍스트가 있는 부분 확인

2. **테이블 구조 확인**
   ```html
   <!-- 예시 1: 테이블 형식 -->
   <table class="nutrition-table">
     <tr>
       <td>칼로리</td>
       <td>563</td>
     </tr>
     <tr>
       <td>단백질</td>
       <td>25.4g</td>
     </tr>
   </table>

   <!-- 예시 2: 리스트 형식 -->
   <ul class="nutrition-list">
     <li>
       <span class="label">칼로리</span>
       <span class="value">563</span>
     </li>
   </ul>

   <!-- 예시 3: div 형식 -->
   <div class="nutrition-item">
     <div class="label">칼로리</div>
     <div class="value">563</div>
   </div>
   ```

3. **각 영양성분의 셀렉터 찾기**
   - "칼로리" 텍스트가 있는 요소 찾기
   - 그 옆의 값이 있는 요소 찾기

**셀렉터 예시:**
```javascript
// 패턴 1: 테이블 행에서 찾기
$('table.nutrition-table tr').each((i, elem) => {
  const label = $(elem).find('td:first-child').text();
  const value = $(elem).find('td:last-child').text();
});

// 패턴 2: 특정 텍스트로 찾기
$('td:contains("칼로리")').next().text()
$('td:contains("단백질")').next().text()

// 패턴 3: 클래스 기반
$('.nutrition-item').each((i, elem) => {
  const label = $(elem).find('.label').text();
  const value = $(elem).find('.value').text();
});
```

---

## 3. 코드 수정

### 3.1 admin.service.ts 파일 열기

```
backend/src/admin/admin.service.ts
```

### 3.2 메뉴 링크 추출 부분 수정

**현재 코드 (약 120번째 줄 근처):**
```typescript
// 메뉴 링크 추출 (FatSecret 사이트 구조에 맞게 수정 필요)
const menuLinks: string[] = [];

// 예시: 메뉴 링크를 찾는 셀렉터 (실제 사이트 구조에 맞게 수정)
$('a[href*="/칼로리-영양소/"]').each((i, elem) => {
  const href = $(elem).attr('href');
  if (href && !menuLinks.includes(href)) {
    menuLinks.push(href.startsWith('http') ? href : `https://www.fatsecret.kr${href}`);
  }
});
```

**수정 방법:**
1. 브라우저에서 확인한 실제 셀렉터로 변경
2. 예시:
   ```typescript
   // 실제 사이트 구조에 맞게 수정
   $('a.food-link').each((i, elem) => {
     const href = $(elem).attr('href');
     if (href && !menuLinks.includes(href)) {
       menuLinks.push(href.startsWith('http') ? href : `https://www.fatsecret.kr${href}`);
     }
   });
   ```

### 3.3 메뉴 이름 추출 부분 수정

**현재 코드 (약 180번째 줄 근처):**
```typescript
// 메뉴 이름 추출 (FatSecret 사이트 구조에 맞게 수정 필요)
const name = $('h1').first().text().trim() || $('.foodName').text().trim();
```

**수정 방법:**
```typescript
// 실제 사이트 구조에 맞게 수정
const name = $('h1.food-name').text().trim();
// 또는
// const name = $('.food-title h1').text().trim();
```

### 3.4 이미지 URL 추출 부분 수정

**현재 코드:**
```typescript
// 이미지 URL 추출
const imageUrl =
  $('img.foodImage').attr('src') ||
  $('img[alt*="' + name + '"]').attr('src') ||
  undefined;
```

**수정 방법:**
```typescript
// 실제 사이트 구조에 맞게 수정
const imageUrl = $('img.food-image').attr('src') || 
                 $('.food-image-container img').attr('src') ||
                 undefined;
```

### 3.5 영양정보 추출 부분 수정

**현재 코드 (약 200번째 줄 근처):**
```typescript
// 칼로리
const kcalText = $('.kcal, .calories, [class*="calorie"]')
  .first()
  .text()
  .replace(/[^0-9]/g, '');
if (kcalText) {
  nutrition.kcal = parseInt(kcalText) || null;
}

// 영양성분 테이블에서 추출
$('table tr, .nutritionRow').each((i, elem) => {
  const label = $(elem).find('td:first-child, .label').text().toLowerCase();
  const value = $(elem)
    .find('td:last-child, .value')
    .text()
    .replace(/[^0-9.]/g, '');

  if (value) {
    const numValue = parseFloat(value);
    if (label.includes('단백질') || label.includes('protein')) {
      nutrition.protein = numValue;
    }
    // ... 기타
  }
});
```

**수정 방법:**
```typescript
// 실제 사이트 구조에 맞게 수정
// 예시 1: 테이블 형식인 경우
$('table.nutrition-table tr').each((i, elem) => {
  const label = $(elem).find('td:first-child').text().toLowerCase();
  const value = $(elem).find('td:last-child').text().replace(/[^0-9.]/g, '');
  
  if (value) {
    const numValue = parseFloat(value);
    if (label.includes('칼로리') || label.includes('calorie')) {
      nutrition.kcal = parseInt(value) || null;
    } else if (label.includes('단백질') || label.includes('protein')) {
      nutrition.protein = numValue;
    }
    // ... 기타 영양성분
  }
});

// 예시 2: 특정 텍스트로 찾는 경우
const kcalText = $('td:contains("칼로리")').next().text().replace(/[^0-9]/g, '');
if (kcalText) {
  nutrition.kcal = parseInt(kcalText) || null;
}
```

---

## 4. 테스트 및 디버깅

### 4.1 디버깅 코드 추가

`admin.service.ts`의 `scrapeMenuFromFatSecret` 메서드에 디버깅 코드 추가:

```typescript
private async scrapeMenuFromFatSecret(
  url: string,
  brandId: string,
): Promise<...> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const $ = cheerio.load(response.data);

    // 디버깅: HTML 구조 확인
    console.log('=== 디버깅 정보 ===');
    console.log('URL:', url);
    console.log('Title:', $('title').text());
    console.log('H1 태그들:', $('h1').map((i, el) => $(el).text()).get());
    console.log('이미지 태그들:', $('img').map((i, el) => $(el).attr('src')).get().slice(0, 5));
    console.log('영양정보 테이블:', $('table').length, '개');
    console.log('==================');

    // 메뉴 이름 추출
    const name = $('h1').first().text().trim();
    console.log('추출된 메뉴 이름:', name);

    // ... 나머지 코드
  }
}
```

### 4.2 테스트 실행

1. **서버 실행**
   ```bash
   npm run start:dev
   ```

2. **로그인**
   ```
   http://localhost:3001/auth/kakao
   ```

3. **수집 실행**
   ```bash
   curl -X POST http://localhost:3001/admin/ingest/mcdonalds/run \
     -H "Cookie: accessToken=your_token"
   ```

4. **콘솔 로그 확인**
   - 서버 터미널에서 디버깅 정보 확인
   - 추출된 데이터 확인

### 4.3 문제 해결

**문제 1: 메뉴 링크가 추출되지 않음**

**확인 사항:**
- 검색 결과 페이지의 실제 HTML 구조
- 셀렉터가 올바른지 확인

**해결:**
```typescript
// 디버깅: 모든 링크 확인
$('a').each((i, elem) => {
  const href = $(elem).attr('href');
  const text = $(elem).text();
  if (href && href.includes('칼로리')) {
    console.log('링크 발견:', href, text);
  }
});
```

**문제 2: 메뉴 이름이 추출되지 않음**

**확인 사항:**
- 상세 페이지의 실제 HTML 구조
- h1 태그가 여러 개인지 확인

**해결:**
```typescript
// 모든 h1 태그 확인
$('h1').each((i, elem) => {
  console.log(`H1 ${i}:`, $(elem).text());
});
```

**문제 3: 영양정보가 추출되지 않음**

**확인 사항:**
- 영양정보가 테이블인지 리스트인지 확인
- 클래스명이나 구조 확인

**해결:**
```typescript
// 모든 테이블 확인
$('table').each((i, elem) => {
  console.log(`테이블 ${i}:`, $(elem).html());
});

// "칼로리" 텍스트가 있는 요소 찾기
$('*:contains("칼로리")').each((i, elem) => {
  console.log('칼로리 발견:', $(elem).text(), $(elem).html());
});
```

---

## 📝 체크리스트

### 사이트 구조 확인
- [ ] 검색 결과 페이지 접속
- [ ] 개발자 도구로 HTML 구조 확인
- [ ] 메뉴 링크의 실제 셀렉터 확인
- [ ] 메뉴 상세 페이지 접속
- [ ] 메뉴 이름의 실제 셀렉터 확인
- [ ] 이미지 URL의 실제 셀렉터 확인
- [ ] 영양정보 테이블의 실제 구조 확인

### 코드 수정
- [ ] `admin.service.ts` 파일 열기
- [ ] 메뉴 링크 추출 셀렉터 수정
- [ ] 메뉴 이름 추출 셀렉터 수정
- [ ] 이미지 URL 추출 셀렉터 수정
- [ ] 영양정보 추출 셀렉터 수정

### 테스트
- [ ] 디버깅 코드 추가
- [ ] 서버 재시작
- [ ] 한 브랜드로 테스트 실행
- [ ] 콘솔 로그 확인
- [ ] 추출된 데이터 확인
- [ ] 필요시 셀렉터 재수정

---

## 💡 셀렉터 작성 팁

### 1. 복사한 셀렉터 사용

브라우저 개발자 도구에서:
1. 요소 선택
2. **우클릭** → **Copy** → **Copy selector**
3. 복사한 셀렉터 사용

### 2. 여러 셀렉터 시도

```typescript
// 여러 셀렉터를 시도하여 가장 안정적인 것 사용
const name = $('h1.food-name').text().trim() ||
             $('.food-title h1').text().trim() ||
             $('h1').first().text().trim();
```

### 3. 텍스트 기반 찾기

```typescript
// 특정 텍스트가 포함된 요소 찾기
$('td:contains("칼로리")').next().text()
$('*:contains("단백질")').closest('tr').find('td:last-child').text()
```

### 4. 속성 기반 찾기

```typescript
// href 속성으로 찾기
$('a[href*="/칼로리-영양소/"]')

// class 속성으로 찾기
$('[class*="food"]')

// data 속성으로 찾기
$('[data-calories]')
```

---

## 🔍 실제 예시

### 예시 1: FatSecret이 다음과 같은 구조인 경우

```html
<!-- 검색 결과 -->
<div class="food-list">
  <div class="food-item">
    <a href="/칼로리-영양소/맥도날드/빅맥" class="food-link">
      <img src="...">
      <span class="food-name">빅맥</span>
    </a>
  </div>
</div>

<!-- 상세 페이지 -->
<h1 class="food-title">빅맥</h1>
<img class="food-image" src="...">
<table class="nutrition">
  <tr>
    <td>칼로리</td>
    <td>563</td>
  </tr>
</table>
```

**셀렉터:**
```typescript
// 링크 추출
$('a.food-link').each((i, elem) => {
  const href = $(elem).attr('href');
  menuLinks.push(`https://www.fatsecret.kr${href}`);
});

// 메뉴 이름
const name = $('h1.food-title').text().trim();

// 이미지
const imageUrl = $('img.food-image').attr('src');

// 영양정보
$('table.nutrition tr').each((i, elem) => {
  const label = $(elem).find('td:first-child').text();
  const value = $(elem).find('td:last-child').text();
  // ...
});
```

---

이제 실제 FatSecret 사이트 구조를 확인하고 셀렉터를 수정할 수 있습니다! 🎉

**다음 단계:**
1. 브라우저에서 FatSecret 사이트 접속
2. 개발자 도구로 구조 확인
3. 셀렉터 복사 또는 작성
4. `admin.service.ts` 수정
5. 테스트 실행
