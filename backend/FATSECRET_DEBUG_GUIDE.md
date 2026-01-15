# FatSecret 데이터 수집 디버깅 가이드

## 🔍 문제 진단

`totalProcessed: 0`이 나오는 경우, 검색 결과 페이지에서 메뉴 링크를 찾지 못한 것입니다.

### 1단계: 서버 로그 확인

Postman으로 요청을 보낸 후, **백엔드 서버 콘솔**에서 다음 로그를 확인하세요:

```
🔍 검색 URL: https://www.fatsecret.kr/...
📄 페이지 제목: ...
🔗 링크 개수: ...
✅ 발견된 메뉴 링크: 0개
⚠️ 메뉴 링크를 찾을 수 없습니다. 셀렉터를 확인하세요.
```

이 로그가 나오면 **셀렉터 문제**입니다.

---

## 🛠️ 해결 방법

### 방법 1: 실제 HTML 구조 확인

1. **브라우저에서 검색 페이지 열기:**
   ```
   https://www.fatsecret.kr/칼로리-영양소/search?q=맥도날드
   ```

2. **개발자 도구 열기:**
   - `F12` 또는 `우클릭 → 검사`

3. **메뉴 링크 찾기:**
   - 예: "빅맥" 링크를 찾아서 `Copy element` 또는 `Copy selector` 실행

4. **셀렉터 확인:**
   - 예: `tr td a.prominent` 또는 다른 셀렉터

---

### 방법 2: 서버 로그에서 디버깅 정보 확인

코드에서 이미 디버깅 로그가 출력됩니다:

```typescript
// 114-125줄: 메뉴 링크가 없을 때 모든 관련 링크 출력
if (menuLinks.length === 0) {
  console.log('⚠️ 메뉴 링크를 찾을 수 없습니다. 셀렉터를 확인하세요.');
  // 디버깅: 모든 링크 출력
  $('a').each((i, elem) => {
    const href = $(elem).attr('href');
    const text = $(elem).text().trim();
    if (href && (href.includes('칼로리') || href.includes('영양'))) {
      console.log(`  링크 ${i}: ${href} - ${text}`);
    }
  });
}
```

**서버 콘솔에서 이 로그를 확인**하고, 실제 링크 구조를 파악하세요.

---

### 방법 3: 셀렉터 수정

서버 로그나 브라우저에서 확인한 실제 셀렉터로 `admin.service.ts`를 수정하세요.

**현재 코드 (89-99줄):**
```typescript
$('tr td a.prominent').each((i, elem) => {
  const href = $(elem).attr('href');
  if (href && href.includes('/칼로리-영양소/')) {
    const fullUrl = href.startsWith('http')
      ? href
      : `https://www.fatsecret.kr${href}`;
    if (!menuLinks.includes(fullUrl)) {
      menuLinks.push(fullUrl);
    }
  }
});
```

**수정 예시:**
실제 HTML 구조에 맞게 셀렉터를 변경하세요.

---

## 📋 단계별 해결 절차

### Step 1: 서버 로그 확인

1. 백엔드 서버 실행 중인지 확인
2. Postman으로 요청 보내기
3. **서버 콘솔**에서 다음 로그 확인:
   - `🔍 검색 URL:`
   - `📄 페이지 제목:`
   - `🔗 링크 개수:`
   - `✅ 발견된 메뉴 링크:`
   - `⚠️ 메뉴 링크를 찾을 수 없습니다...` (이 부분이 나오면 문제)

### Step 2: 브라우저에서 실제 구조 확인

1. **검색 페이지 열기:**
   ```
   https://www.fatsecret.kr/칼로리-영양소/search?q=맥도날드
   ```

2. **개발자 도구 열기** (`F12`)

3. **메뉴 링크 찾기:**
   - 예: "빅맥" 텍스트를 찾아서 우클릭 → 검사
   - 또는 Elements 탭에서 `Ctrl+F`로 "빅맥" 검색

4. **HTML 구조 확인:**
   ```html
   <!-- 예시 1 -->
   <tr>
     <td>
       <a class="prominent" href="/칼로리-영양소/...">빅맥</a>
     </td>
   </tr>
   
   <!-- 예시 2 -->
   <div class="search-result">
     <a href="/칼로리-영양소/...">빅맥</a>
   </div>
   ```

5. **셀렉터 복사:**
   - 링크 요소 우클릭 → `Copy` → `Copy selector`
   - 예: `#content > table > tbody > tr > td > a.prominent`

### Step 3: 셀렉터 수정

`admin.service.ts`의 89-112줄을 실제 구조에 맞게 수정:

```typescript
// 예시: 실제 셀렉터가 다를 경우
$('div.search-result a').each((i, elem) => {
  // 또는
$('#content table tbody tr td a').each((i, elem) => {
  // 실제 구조에 맞게 수정
```

### Step 4: 다시 테스트

1. 서버 재시작 (코드 변경 후)
2. Postman으로 다시 요청
3. 서버 로그 확인:
   ```
   ✅ 발견된 메뉴 링크: 10개  (0이 아닌 숫자가 나와야 함)
   📦 처리할 메뉴: 10개
   ```

---

## 🔧 임시 해결책: 수동 테스트

셀렉터를 찾기 전에, 실제 링크가 있는지 확인하는 테스트 코드를 추가할 수 있습니다.

### 테스트 엔드포인트 추가 (선택사항)

`admin.controller.ts`에 디버깅용 엔드포인트 추가:

```typescript
@Get('ingest/:brandSlug/debug')
async debugIngest(@Param('brandSlug') brandSlug: string) {
  // 검색 페이지 HTML을 그대로 반환하여 확인
  // (실제 구현은 admin.service.ts에 추가)
}
```

---

## 📝 체크리스트

- [ ] 서버가 실행 중인가?
- [ ] Postman 요청이 성공했는가? (200 OK)
- [ ] 서버 콘솔에 로그가 출력되는가?
- [ ] `발견된 메뉴 링크: 0개`가 나오는가?
- [ ] 브라우저에서 검색 페이지가 정상적으로 열리는가?
- [ ] 개발자 도구로 실제 HTML 구조를 확인했는가?
- [ ] 셀렉터를 수정했는가?
- [ ] 서버를 재시작했는가?
- [ ] 다시 테스트했는가?

---

## 💡 추가 팁

### 1. User-Agent 확인

FatSecret이 봇을 차단할 수 있으므로, User-Agent가 올바른지 확인하세요.

현재 코드 (71-76줄):
```typescript
headers: {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...',
}
```

### 2. 네트워크 에러 확인

서버 로그에서 axios 에러가 나오는지 확인:
```
❌ 수집 실패: Request failed with status code 403
```

403 에러가 나오면 봇 차단일 수 있습니다.

### 3. 페이지 로딩 시간

FatSecret이 JavaScript로 동적 로딩을 할 수 있으므로, 실제 HTML이 로드되는지 확인하세요.

---

## 🚀 다음 단계

1. **서버 로그 확인** → 문제 파악
2. **브라우저에서 구조 확인** → 실제 셀렉터 찾기
3. **코드 수정** → 셀렉터 업데이트
4. **재테스트** → 데이터 수집 확인

문제가 계속되면, **서버 로그의 전체 출력 내용**을 공유해주시면 더 정확한 해결책을 제시할 수 있습니다!
