# FatSecret에서 탄수화물/지방 정보 업데이트 가이드

## 📋 기능 설명

맥도날드 공식 영양성분표에는 탄수화물과 지방 정보가 없습니다. FatSecret에서 이 정보만 가져와서 기존 메뉴 데이터에 추가하는 기능입니다.

## 🔧 동작 방식

1. 해당 브랜드의 모든 버거 메뉴 조회
2. 각 메뉴에 대해 FatSecret에서 검색
3. 검색 결과에서 첫 번째 메뉴 링크 찾기
4. 메뉴 상세 페이지에서 탄수화물과 지방 정보만 추출
5. 기존 영양정보에 업데이트 (다른 정보는 유지)

## 📡 API 엔드포인트

```
POST /admin/nutrition/update-from-fatsecret/:brandSlug
```

**예시:**

```
POST http://localhost:3001/admin/nutrition/update-from-fatsecret/mcdonalds
Authorization: Bearer {your_access_token}
```

## 📊 응답 형식

```json
{
  "success": true,
  "brand": "맥도날드",
  "total": 20,
  "updated": 18,
  "errors": 2,
  "errorDetails": [
    "메뉴명1: 검색 결과에서 링크를 찾을 수 없음",
    "메뉴명2: 영양정보 추출 실패"
  ]
}
```

## ⚠️ 주의사항

1. **서버 부하 방지**: 각 메뉴마다 0.5초 대기 시간이 있습니다.
2. **검색 정확도**: 메뉴 이름이 정확히 일치하지 않으면 검색 결과를 찾지 못할 수 있습니다.
3. **기존 데이터 보존**: 탄수화물과 지방만 업데이트하며, 다른 영양정보(kcal, protein, sodium 등)는 유지됩니다.

## 🔍 사용 예시

### Postman 설정

1. **Method**: POST
2. **URL**: `http://localhost:3001/admin/nutrition/update-from-fatsecret/mcdonalds`
3. **Headers**:
   - `Authorization: Bearer {your_access_token}`
   - `Content-Type: application/json`

4. **요청 전송**

### 예상 소요 시간

- 메뉴 20개 기준: 약 10-15초 (각 메뉴당 0.5초 대기 + 네트워크 시간)

## 📝 로그 확인

서버 콘솔에서 다음과 같은 로그를 확인할 수 있습니다:

```
🔍 맥도날드 버거 메뉴 20개에 대한 탄수화물/지방 정보 업데이트 시작...

[1/20] 처리 중: 빅맥
  🔗 메뉴 상세 페이지: https://www.fatsecret.kr/...
  ✅ 업데이트 완료: 탄수화물=47g, 지방=27g

[2/20] 처리 중: 맥스파이시 상하이 버거
  🔗 메뉴 상세 페이지: https://www.fatsecret.kr/...
  ✅ 업데이트 완료: 탄수화물=50g, 지방=13.7g

...

📊 업데이트 완료: 18개 성공, 2개 실패
```

## 🎯 다음 단계

1. Postman으로 요청 전송
2. 서버 로그 확인
3. 데이터베이스에서 업데이트된 영양정보 확인:
   ```
   GET http://localhost:3001/brands/mcdonalds/menu-items?category=burger
   ```
