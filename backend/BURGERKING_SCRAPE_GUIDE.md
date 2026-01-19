# 버거킹 메뉴 수집 가이드

## 📋 기능 설명

버거킹 공식 메뉴 사이트(https://www.burgerking.co.kr/menu/main)에서 각 버거 메뉴의 정보를 자동으로 수집하여 데이터베이스에 저장하는 기능입니다.

수집하는 정보:

- **메뉴 이름**: 상세 페이지에서 정확한 이름 추출
- **이미지 URL**: 메뉴 상세 페이지의 메인 이미지
- **영양성분**: 열량, 단백질, 나트륨, 당류, 포화지방
- **상세 페이지 URL**: 메뉴 상세 페이지 링크

## 🔧 동작 방식

1. **메뉴 목록 페이지 접속**: `https://www.burgerking.co.kr/menu/main`
2. **메뉴 링크 추출**: 각 메뉴의 상세 페이지 링크(`/menu/detail/{id}`) 추출
3. **상세 페이지 처리**: 각 메뉴 상세 페이지에서:
   - 이미지 URL 추출
   - 메뉴 이름 확인
   - 영양성분 정보 추출 (테이블 또는 텍스트에서)
4. **데이터베이스 저장**: 메뉴 아이템과 영양정보 저장 또는 업데이트

## 📡 API 엔드포인트

```
POST /admin/menu-items/burgerking/scrape
```

**예시:**

```
POST http://localhost:3001/admin/menu-items/burgerking/scrape
Authorization: Bearer {your_access_token}
```

## 📊 응답 형식

```json
{
  "success": true,
  "brand": "버거킹",
  "total": 35,
  "created": 30,
  "updated": 5,
  "errors": 0,
  "errorDetails": []
}
```

## 🔍 영양성분 추출 방법

### 방법 1: 테이블에서 추출

- 페이지의 `<table>` 태그에서 영양성분 테이블 찾기
- "열량", "단백질", "나트륨" 등의 키워드로 테이블 식별
- 각 행에서 라벨과 값을 매칭하여 추출

### 방법 2: 텍스트에서 추출

- 테이블을 찾지 못한 경우, 페이지 전체 텍스트에서 정규식으로 추출
- 패턴 예시:
  - 열량: `열량[:\s]*(\d+)\s*kcal`
  - 단백질: `단백질[:\s]*(\d+(?:\.\d+)?)\s*g`
  - 나트륨: `나트륨[:\s]*(\d+)\s*mg`
  - 당류: `당류[:\s]*(\d+(?:\.\d+)?)\s*g`
  - 포화지방: `포화지방[:\s]*(\d+(?:\.\d+)?)\s*g`

## ⚠️ 주의사항

1. **서버 부하 방지**: 각 메뉴 상세 페이지마다 1초 대기 시간이 있습니다.
2. **JavaScript 렌더링**: 버거킹 사이트가 JavaScript로 동적 렌더링되는 경우, 실제 HTML 구조가 다를 수 있습니다.
3. **영양성분 버튼**: "원산지,영양성분,알레르기유발성분" 버튼을 클릭해야 하는 경우, 해당 정보가 이미 페이지에 포함되어 있으면 자동으로 추출됩니다.
4. **메뉴 이름 매칭**: 상세 페이지에서 정확한 메뉴 이름을 추출하므로, 목록 페이지의 이름과 다를 수 있습니다.

## 🔍 사용 예시

### Postman 설정

1. **Method**: POST
2. **URL**: `http://localhost:3001/admin/menu-items/burgerking/scrape`
3. **Headers**:
   - `Authorization: Bearer {your_access_token}`
   - `Content-Type: application/json`

4. **요청 전송**

### 예상 소요 시간

- 메뉴 35개 기준: 약 35-40초 (각 메뉴당 1초 대기 + 네트워크 시간)

## 📝 로그 확인

서버 콘솔에서 다음과 같은 로그를 확인할 수 있습니다:

```
🍔 버거킹 메뉴 수집 시작...

📄 메뉴 목록 페이지 접속: https://www.burgerking.co.kr/menu/main
📋 총 35개의 메뉴 링크를 찾았습니다.

[1/35] 처리 중: 와퍼 (https://www.burgerking.co.kr/menu/detail/1100779)
  ✅ 업데이트 완료: 와퍼
    이미지: https://www.burgerking.co.kr/...
    영양성분: {"kcal":773,"protein":43,"sodium":1714,"sugar":9,"saturatedFat":15}

[2/35] 처리 중: 치즈와퍼 (https://www.burgerking.co.kr/menu/detail/...)
  ✅ 생성 완료: 치즈와퍼
    이미지: https://www.burgerking.co.kr/...
    영양성분: {"kcal":650,"protein":35,"sodium":1200}

...

📊 수집 완료: 30개 생성, 5개 업데이트, 0개 실패
```

## 🎯 다음 단계

1. Postman으로 요청 전송
2. 서버 로그 확인
3. 데이터베이스에서 수집된 메뉴 확인:

   ```sql
   SELECT name, image_url, detail_url
   FROM menu_items
   WHERE brand_id = (SELECT id FROM brands WHERE slug = 'burgerking')
     AND category = 'burger';
   ```

4. 영양정보 확인:
   ```sql
   SELECT mi.name, n.kcal, n.protein, n.sodium, n.sugar, n.saturated_fat
   FROM menu_items mi
   LEFT JOIN nutrition n ON n.menu_item_id = mi.id
   WHERE mi.brand_id = (SELECT id FROM brands WHERE slug = 'burgerking')
     AND mi.category = 'burger';
   ```

## 🔧 문제 해결

### 메뉴 링크를 찾을 수 없는 경우

1. **웹사이트 구조 확인**: 버거킹 사이트의 HTML 구조가 변경되었을 수 있습니다.
2. **선택자 조정**: `admin.service.ts`의 `scrapeBurgerKingMenus` 메서드에서 선택자를 수정해야 할 수 있습니다.
3. **JavaScript 렌더링**: 사이트가 JavaScript로 동적 렌더링되는 경우, Puppeteer 같은 도구가 필요할 수 있습니다.

### 영양성분을 추출할 수 없는 경우

1. **테이블 구조 확인**: 영양성분 테이블의 HTML 구조가 예상과 다를 수 있습니다.
2. **버튼 클릭 필요**: "원산지,영양성분,알레르기유발성분" 버튼을 클릭해야 하는 경우, JavaScript 실행이 필요할 수 있습니다.
3. **수동 확인**: 특정 메뉴의 영양성분을 수동으로 확인하고 직접 입력할 수 있습니다.

### 이미지 URL을 찾을 수 없는 경우

1. **이미지 선택자 확인**: 메인 이미지의 선택자가 변경되었을 수 있습니다.
2. **지연 로딩**: 이미지가 지연 로딩되는 경우, `data-src` 또는 `data-lazy-src` 속성을 확인해야 합니다.
3. **수동 입력**: 특정 메뉴의 이미지 URL을 수동으로 입력할 수 있습니다.

## 📌 참고사항

- 버거킹 사이트는 JavaScript로 동적 렌더링될 수 있으므로, 실제 HTML 구조를 확인하고 선택자를 조정해야 할 수 있습니다.
- 영양성분 정보는 "원산지,영양성분,알레르기유발성분" 버튼을 클릭해야 표시되는 경우가 많습니다. 이 경우 JavaScript 실행이 필요할 수 있습니다.
- 메뉴 이름은 상세 페이지에서 정확한 이름을 추출하므로, 목록 페이지의 이름과 다를 수 있습니다.
