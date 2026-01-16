# 맥도날드 버거 데이터 입력 가이드

## 📋 데이터 입력 과정

### 1단계: JSON 파일 준비 완료
✅ `menu-items-examples/mcdonalds-burgers-with-nutrition.json` 파일 생성 완료

### 2단계: Postman으로 데이터 입력

#### 2-1. 인증 토큰 받기
먼저 JWT 토큰이 필요합니다.

**방법 1: Kakao 로그인**
```
GET http://localhost:3001/auth/kakao
```
→ 브라우저에서 리다이렉트되며 쿠키에 토큰이 저장됩니다.

**방법 2: Postman에서 직접 토큰 사용**
- 이전에 받은 `accessToken`을 사용하거나
- Postman의 Cookie 자동 관리 기능 활용

#### 2-2. Postman 설정

1. **Headers 설정:**
   ```
   Content-Type: application/json
   Authorization: Bearer {your_access_token}
   ```
   또는
   ```
   Cookie: accessToken={your_access_token}
   ```

2. **Body 설정:**
   - `raw` 선택
   - `JSON` 형식 선택
   - `menu-items-examples/mcdonalds-burgers-with-nutrition.json` 파일 내용 복사하여 붙여넣기

3. **요청 전송:**
   ```
   POST http://localhost:3001/admin/menu-items/bulk
   ```

### 3단계: 결과 확인

성공 시 응답 예시:
```json
{
  "success": true,
  "brand": "맥도날드",
  "total": 20,
  "created": 20,
  "updated": 0,
  "errors": 0,
  "errorDetails": []
}
```

### 4단계: 데이터 확인

메뉴 조회로 확인:
```
GET http://localhost:3001/brands/mcdonalds/menu-items?category=burger
```

또는 개별 메뉴 조회:
```
GET http://localhost:3001/menu-items/{menu-item-id}
```

## ⚠️ 주의사항

### 영양성분표에 없는 데이터

맥도날드 영양성분표에는 다음 정보만 제공됩니다:
- ✅ 열량 (kcal)
- ✅ 포화지방 (g)
- ✅ 당 (sugar, g)
- ✅ 단백질 (g)
- ✅ 나트륨 (mg)
- ❌ 탄수화물 (carbohydrate) - **없음**
- ❌ 지방 (fat) - **없음**

따라서 현재 JSON에는 다음 필드만 포함되어 있습니다:
- `kcal`
- `saturatedFat`
- `sugar`
- `protein`
- `sodium`

`carbohydrate`와 `fat`은 나중에 수동으로 추가하거나, 다른 출처에서 찾아서 추가할 수 있습니다.

## 📝 데이터 입력된 메뉴 목록

1. ✅ 행운버거 골드
2. ✅ 빅맥
3. ✅ 맥스파이시 상하이 버거
4. ✅ 1955 버거
5. ✅ 더블 쿼터 파운더 치즈
6. ✅ 쿼터파운더 치즈
7. ✅ 맥크리스피 디럭스 버거
8. ✅ 맥크리스피 클래식 버거
9. ✅ 베이컨 토마토 디럭스
10. ✅ 맥치킨 모짜렐라
11. ✅ 맥치킨
12. ✅ 더블 불고기 버거
13. ✅ 불고기 버거
14. ✅ 슈비 버거
15. ✅ 슈슈 버거
16. ✅ 토마토 치즈 비프 버거
17. ✅ 트리플 치즈버거
18. ✅ 더블 치즈버거
19. ✅ 치즈버거
20. ✅ 햄버거

**총 20개 메뉴** - 모두 영양성분표에 존재하며 데이터 입력 완료!

## 🔍 누락된 영양성분

맥도날드 영양성분표에는 **탄수화물(carbohydrate)**과 **지방(fat)** 정보가 없습니다.

만약 이 정보가 필요하다면:
1. 다른 출처에서 찾아서 수동으로 추가
2. 또는 나중에 사용자가 제공

## 📌 다음 단계

1. Postman으로 `POST /admin/menu-items/bulk` 요청 전송
2. 결과 확인
3. 필요시 `carbohydrate`와 `fat` 데이터 추가
