# 수동 메뉴 입력 가이드

FatSecret 스크래핑을 대체하여 수동으로 메뉴 정보를 입력하는 방법입니다.

## API 엔드포인트

### 1. 단일 메뉴 추가
```
POST /admin/menu-items/:brandSlug
```

**예시:**
```json
POST http://localhost:3001/admin/menu-items/mcdonalds
Content-Type: application/json
Authorization: Bearer {accessToken}

{
  "name": "빅맥",
  "category": "burger",
  "imageUrl": "https://example.com/image.jpg",
  "detailUrl": "https://www.mcdonalds.co.kr/kor/menu/burger",
  "isActive": true,
  "nutrition": {
    "kcal": 583,
    "carbohydrate": 47.00,
    "protein": 27.00,
    "fat": 27.00,
    "saturatedFat": 11.00,
    "sodium": 902,
    "sugar": 7.00
  }
}
```

### 2. 일괄 메뉴 추가
```
POST /admin/menu-items/bulk
```

**예시:**
```json
POST http://localhost:3001/admin/menu-items/bulk
Content-Type: application/json
Authorization: Bearer {accessToken}

{
  "brandSlug": "mcdonalds",
  "menuItems": [
    {
      "name": "빅맥",
      "category": "burger",
      "isActive": true,
      "nutrition": {
        "kcal": 583,
        "carbohydrate": 47.00,
        "protein": 27.00,
        "fat": 27.00,
        "saturatedFat": 11.00,
        "sodium": 902,
        "sugar": 7.00
      }
    },
    {
      "name": "맥스파이시 상하이 버거",
      "category": "burger",
      "isActive": true,
      "nutrition": {
        "kcal": 500,
        "carbohydrate": 50.00,
        "protein": 24.00,
        "fat": 13.70,
        "saturatedFat": 5.00,
        "sodium": 50113,
        "sugar": 9.00
      }
    }
  ]
}
```

## 브랜드 Slug 목록

- `mcdonalds` - 맥도날드
- `burgerking` - 버거킹
- `lotteria` - 롯데리아
- `momstouch` - 맘스터치
- `kfc` - KFC
- `nobrand` - 노브랜드버거
- `frank` - 프랭크버거

## 영양성분 필드

모든 필드는 선택사항입니다:

- `kcal`: 열량 (정수)
- `carbohydrate`: 탄수화물 (소수점, g)
- `protein`: 단백질 (소수점, g)
- `fat`: 지방 (소수점, g)
- `saturatedFat`: 포화지방 (소수점, g)
- `sodium`: 나트륨 (정수, mg)
- `sugar`: 설탕당 (소수점, g)

## 동작 방식

1. **기존 메뉴가 있는 경우**: 업데이트됩니다 (이름과 브랜드가 일치하는 경우)
2. **새 메뉴인 경우**: 새로 생성됩니다
3. **영양성분이 제공된 경우**: 자동으로 연결됩니다

## Postman 사용 예시

1. **인증 토큰 받기** (Kakao 로그인 또는 JWT 토큰)
2. **Headers에 추가:**
   - `Authorization: Bearer {your_access_token}`
   - `Content-Type: application/json`
3. **Body에 JSON 데이터 입력**
4. **요청 전송**

## 맥도날드 버거 메뉴 목록

다음 메뉴들이 등록되어야 합니다:

1. 행운버거 골드
2. 빅맥
3. 맥스파이시 상하이 버거
4. 1955 버거
5. 더블 쿼터 파운더 치즈
6. 쿼터파운더 치즈
7. 맥크리스피 디럭스 버거
8. 맥크리스피 클래식 버거
9. 베이컨 토마토 디럭스
10. 맥치킨 모짜렐라
11. 맥치킨
12. 더블 불고기 버거
13. 불고기 버거
14. 슈비 버거
15. 슈슈 버거
16. 토마토 치즈 비프 버거
17. 트리플 치즈버거
18. 더블 치즈버거
19. 치즈버거
20. 햄버거

## 참고

- `menu-items-examples/mcdonalds-burgers.json` 파일에 메뉴 이름만 있는 예시가 있습니다.
- 영양성분표를 받으면 해당 JSON에 `nutrition` 필드를 추가하여 일괄 업로드할 수 있습니다.
