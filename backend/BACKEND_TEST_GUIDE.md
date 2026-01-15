# 백엔드 테스트 가이드

## 🧪 백엔드에서만 테스트하기

현재 설정은 카카오 로그인 성공/실패 시 **JSON 응답**을 반환합니다. 프론트엔드로 리다이렉트하지 않습니다.

---

## 📋 테스트 방법

### 1단계: 카카오 로그인 시작

브라우저에서 접속:

```
http://localhost:3001/auth/kakao
```

카카오 로그인 페이지로 리다이렉트됩니다.

### 2단계: 카카오 로그인 완료

카카오 계정으로 로그인하면 자동으로 콜백 URL로 이동합니다:

```
http://localhost:3001/auth/kakao/callback?code=...
```

### 3단계: 응답 확인

**성공 시:**

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
    "accessToken": "jwt_token...",
    "refreshToken": "jwt_token..."
  },
  "cookies": {
    "accessToken": "설정됨",
    "refreshToken": "설정됨"
  }
}
```

**실패 시:**

```json
{
  "success": false,
  "message": "에러 메시지",
  "error": {
    "code": "invalid_client",
    "description": "Bad client credentials",
    "errorCode": "KOE010"
  },
  "details": {
    "error": "invalid_client",
    "error_description": "Bad client credentials",
    "error_code": "KOE010"
  }
}
```

---

## 🔍 쿠키 확인 방법

### 브라우저 개발자 도구

1. **F12** 키로 개발자 도구 열기
2. **Application** 탭 (Chrome) 또는 **Storage** 탭 (Firefox)
3. **Cookies** → `http://localhost:3001` 선택
4. 다음 쿠키 확인:
   - `accessToken`
   - `refreshToken`

### curl로 테스트

```bash
# 로그인 후 쿠키 확인
curl -v http://localhost:3001/auth/kakao/callback?code=YOUR_CODE

# 쿠키와 함께 내 정보 조회
curl -b "accessToken=YOUR_TOKEN" http://localhost:3001/auth/me
```

---

## ✅ 체크리스트

- [ ] `http://localhost:3001/auth/kakao` 접속
- [ ] 카카오 로그인 완료
- [ ] JSON 응답 확인
- [ ] 쿠키 설정 확인 (개발자 도구)
- [ ] `/auth/me` 엔드포인트 테스트

---

## 🔄 프론트엔드 연동 시 변경

프론트엔드와 연동할 때는 `auth.controller.ts`의 `kakaoCallback` 메서드를 수정하여 리다이렉트하도록 변경하세요:

```typescript
// 프론트엔드로 리다이렉트
const frontendUrl =
  this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
res.redirect(`${frontendUrl}/auth/callback?success=true`);
```

---

## 🐛 문제 해결

### 쿠키가 설정되지 않음

- 브라우저 개발자 도구에서 쿠키 확인
- `httpOnly: true`이므로 JavaScript에서 접근 불가 (정상)
- 서버에서만 접근 가능

### JSON 응답이 안 보임

- 브라우저에서 직접 접속하면 JSON이 표시됨
- Postman이나 curl로도 테스트 가능

---

이제 백엔드에서만 테스트할 수 있습니다! 🎉
