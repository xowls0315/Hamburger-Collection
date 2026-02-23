# Supabase + UptimeRobot 무료 배포 가이드

Render PostgreSQL 무료 플랜의 **30일 만료**와 **Web Service 15분 sleep**을 피하기 위해,  
**Supabase(DB)** + **Render(Web Service)** + **UptimeRobot(5분 핑)** 조합으로 전환하는 과정을 단계별로 정리했습니다.

---

## 전체 흐름 요약

| 순서 | 작업 | 목적 |
|------|------|------|
| 1 | Supabase 프로젝트 생성 | 무료 PostgreSQL DB 확보 (30일 만료 없음) |
| 2 | Supabase DB 연결 정보 확인 | 백엔드 환경변수 입력용 |
| 3 | DBeaver로 Supabase DB 연결 후 `final.sql` 실행 | 테이블·시드·트리거 생성 |
| 4 | Render Web Service 환경변수를 Supabase 값으로 변경 | 백엔드가 Supabase DB 사용 |
| 5 | UptimeRobot 모니터 등록 (5분 간격) | Render sleep 방지 + Supabase 7일 pause 방지 |
| 6 | 배포 확인 및 동작 테스트 | API·DB 정상 여부 확인 |

---

## 1단계: Supabase 프로젝트 생성

1. **가입 및 로그인**  
   - https://supabase.com 접속 후 **Start your project** → GitHub 등으로 로그인.

2. **New Project 생성**  
   - **New project** 클릭  
   - **Organization**: 기본값 또는 새로 생성  
   - **Name**: 예) `hamburger-collection`  
   - **Database Password**: 강한 비밀번호 생성 후 **반드시 안전한 곳에 저장** (한 번만 표시됨)  
   - **Region**: `Northeast Asia (Seoul)` 또는 가까운 리전 선택  
   - **Pricing Plan**: **Free** 선택  
   - **Create new project** 클릭 후 DB 생성 완료될 때까지 대기 (1~2분)

3. **무료 플랜 참고**  
   - DB 용량 500MB, 7일 연속 미사용 시 프로젝트 일시정지(pause).  
   - UptimeRobot으로 백엔드 URL을 5분마다 호출하고, 백엔드에서 DB를 조회하도록 하면 “사용”으로 인정되어 pause를 피할 수 있습니다.

---

## 2단계: Supabase DB 연결 정보 확인

1. Supabase 대시보드에서 해당 **프로젝트** 선택.

2. 왼쪽 메뉴 **Project Settings** (휴지통 아이콘 아래 톱니바퀴) 클릭.

3. **Database** 탭 선택.

4. 아래 항목을 메모 (나중에 Render 환경변수에 넣음):

   - **Host**: `db.xxxxxxxxxxxxx.supabase.co` (Project ref 기반)
   - **Port**: `5432` (Direct connection)  
     - 참고: Transaction pooler는 `6543`인데, TypeORM은 보통 Direct(5432) 사용.
   - **Database name**: `postgres`
   - **User**: `postgres`
   - **Password**: 프로젝트 생성 시 저장한 DB 비밀번호

5. **Connection string** (선택 사항):  
   - **URI** 탭에서 **Direct connection** 문자열 복사 가능.  
   - 형식:  
     `postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres`  
     또는 Direct:  
     `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`  
   - 이 프로젝트 백엔드는 `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` 를 쓰므로, **개별 값**으로 넣어도 됩니다.

6. **SSL**: Supabase는 기본적으로 SSL 필요.  
   - Render 환경변수에 **`DB_SSL=true`** 로 설정하면 됩니다.

---

## 3단계: DBeaver로 Supabase DB 연결 후 스키마 적용

1. **DBeaver 실행** → 새 연결 생성 (PostgreSQL).

2. **연결 설정**  
   - Host: `db.xxxxxxxxxxxxx.supabase.co` (2단계에서 확인한 Host)  
   - Port: `5432`  
   - Database: `postgres`  
   - Username: `postgres`  
   - Password: DB 비밀번호  
   - **SSL** 탭에서 **Use SSL** 체크 (Supabase는 SSL 필수).

3. **Test Connection** 후 **Finish**.

4. **스키마 적용**  
   - 프로젝트의 `backend/database/final.sql` 내용을 **Supabase SQL Editor**에 붙여넣고 **Run** 하거나, DBeaver에서 Supabase 연결 후 동일 스크립트를 실행합니다.  
   - 스키마 `hamburger-collection`, 테이블·인덱스·트리거·시드가 생성됩니다.  
   - **백엔드 환경변수**에는 반드시 `DB_SCHEMA=hamburger-collection` 을 설정해야 합니다.

5. **확인**  
   - Supabase: **Table Editor** 왼쪽에서 스키마 `hamburger-collection` 선택 시 `brands`, `users`, `menu_items` 등 테이블이 보이면 성공.

---

## 4단계: Render Web Service 환경변수를 Supabase로 변경

1. **Render 대시보드** (https://dashboard.render.com) 로그인.

2. 해당 **Web Service** (백엔드 서비스) 선택.

3. **Environment** 탭 이동.

4. **DB 관련 환경변수**를 Supabase 값으로 수정/추가:

   | Key | 값 (예시) |
   |-----|-----------|
   | `DB_HOST` | `db.xxxxxxxxxxxxx.supabase.co` |
   | `DB_PORT` | `5432` |
   | `DB_USERNAME` | `postgres` |
   | `DB_PASSWORD` | (Supabase DB 비밀번호) |
   | `DB_DATABASE` | `postgres` |
   | `DB_SCHEMA` | `hamburger-collection` (final.sql에서 사용하는 스키마 이름) |
   | `DB_SSL` | `true` |

5. **Save Changes** 후 **Manual Deploy** → **Deploy latest commit** (또는 자동 배포 시 최신 커밋이 배포되도록 확인).

6. 배포가 끝난 뒤 **Logs**에서 앱이 정상 기동하는지, DB 연결 에러가 없는지 확인.

---

## 5단계: UptimeRobot 설정 (5분마다 핑)

1. **가입**  
   - https://uptimerobot.com 접속 후 무료 계정 생성.

2. **모니터 추가**  
   - **+ Add New Monitor** 클릭.

3. **모니터 설정**  
   - **Monitor Type**: `HTTP(s)`  
   - **Friendly Name**: 예) `Hamburger Backend`  
   - **URL**:  
     - Render Web Service 주소 + **헬스 체크 경로**  
     - 예: `https://hamburger-collection-backend.onrender.com/health`  
     - (루트 `/` 대신 `/health` 사용 권장: 서버가 DB까지 확인하는 전용 엔드포인트)  
   - **Monitoring Interval**: **5 minutes** 선택.

4. **Create Monitor** 저장.

5. **동작**  
   - 5분마다 UptimeRobot이 위 URL로 요청 → Render 서비스가 sleep 해제.  
   - 해당 요청이 백엔드를 타고 DB를 조회하므로, Supabase도 “활동 있음”으로 인식해 7일 pause를 피할 수 있습니다.

---

## 6단계: 배포 및 동작 확인

1. **API 문서**  
   - 브라우저에서 `https://[당신-백엔드-URL]/api-docs` 접속해 Swagger가 뜨는지 확인.

2. **헬스 체크**  
   - `https://[당신-백엔드-URL]/health`  
   - 예상 응답: `{ "status": "ok", "database": "connected" }` (또는 비슷한 형태)

3. **DB 연동 확인**  
   - Swagger 또는 프론트에서 브랜드 목록, 메뉴 목록 등 조회해 200 응답이 오는지 확인.

4. **UptimeRobot**  
   - 몇 분 후 UptimeRobot 대시보드에서 모니터 상태가 **Up**으로 표시되는지 확인.

---

## 주의사항 및 트러블슈팅

- **Supabase 비밀번호**: 프로젝트 생성 시 한 번만 표시되므로 반드시 저장. 잃어버리면 재설정 필요.
- **DB_SSL**: Supabase는 SSL 필수이므로 `DB_SSL=true` 없으면 연결 실패할 수 있음.
- **Render 750시간/월**: 무료 Web Service는 월 750시간 제한. 5분 핑으로 깨워두면 한 달 기준으로 750시간 이내로 사용 가능.
- **Supabase 7일 pause**: 실제 트래픽이 거의 없어도 UptimeRobot → `/health` → DB 쿼리가 주기적으로 발생하면 pause를 피할 수 있음.  
  일시정지된 경우 Supabase 대시보드 **Project Settings** → **General**에서 **Restore project**로 복구 가능.
- **기존 Render PostgreSQL 데이터 이전**: 기존 DB에 중요한 데이터가 있다면, DBeaver로 Render DB에서 데이터 export 후 Supabase DB에 import하는 방식을 별도로 진행하면 됩니다.

---

## 체크리스트

- [ ] Supabase 프로젝트 생성 및 DB 비밀번호 저장
- [ ] Supabase Database 설정에서 Host, Port, User, Database, Password 확인
- [ ] DBeaver로 Supabase 연결 (SSL 사용) 후 `final.sql` 실행
- [ ] Render Web Service 환경변수 DB_* 를 Supabase 값으로 변경, DB_SSL=true 설정
- [ ] Render 재배포 후 로그에서 DB 연결 성공 확인
- [ ] UptimeRobot에 `/health` URL 5분 간격 모니터 추가
- [ ] `/health` 응답 및 API 문서·프론트 동작 확인

이 순서대로 진행하면 결제 없이 Supabase + Render + UptimeRobot으로 30일 DB 만료와 sleep 문제를 완화할 수 있습니다.
