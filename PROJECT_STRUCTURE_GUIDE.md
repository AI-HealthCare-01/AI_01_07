# 프로젝트 디렉터리 작성 가이드

이 문서는 `AI_Health_final` 프로젝트의 현재 구조를 기준으로, 각 디렉터리에 어떤 내용을 작성해야 하는지 정리한 가이드입니다.

## 1) 루트 디렉터리

### `README.md`
- 작성 내용: 프로젝트 개요, 실행 방법, 배포 절차, 개발 규칙.

### `pyproject.toml`
- 작성 내용: Python 의존성, tool 설정(ruff/mypy/pytest 등), 패키지 메타데이터.

### `uv.lock`
- 작성 내용: 직접 수정하지 않음.
- 비고: `uv sync`로 의존성 해석 결과가 자동 반영됨.

### `docker-compose.yml`, `docker-compose.prod.yml`
- 작성 내용: 서비스(app/ai_worker/mysql/redis/nginx) 구성, 네트워크, 볼륨, 환경변수 매핑.

### `.github/`
- 작성 내용: CI/CD 워크플로우, PR 템플릿, 커밋 템플릿.
- 현재 파일: `workflows/checks.yml`, `PULL_REQUEST_TEMPLATE.md`, `commit_template.txt`.

### `envs/`
- 작성 내용: 환경변수 샘플(`example.*.env`)과 실제 실행용 `.env` 파일.
- 원칙: 비밀값은 샘플에 넣지 않고, 실제값은 로컬/배포 환경 파일에만 관리.

### `nginx/`
- 작성 내용: 리버스 프록시 및 HTTPS 설정.
- 현재 파일 역할:
  - `default.conf`: 기본 라우팅
  - `prod_http.conf`: 운영 HTTP 설정
  - `prod_https.conf`: 운영 HTTPS 설정

### `scripts/`
- 작성 내용: 반복 작업 자동화 스크립트(배포, 인증서, CI 검사).
- 현재 파일 역할:
  - `deployment.sh`: 배포 자동화
  - `certbot.sh`: 인증서 발급/갱신
  - `ci/*.sh`: 테스트/포맷팅/타입체크

### `.venv/`, `.idea/`, `__pycache__/`, `.DS_Store`
- 작성 내용: 직접 작성 대상 아님(환경/IDE/캐시 생성물).

---

## 2) `app/` (FastAPI 서버)

### `app/main.py`
- 작성 내용: FastAPI 앱 생성, 전역 미들웨어/예외 처리/라우터 등록/부트스트랩.

### `app/apis/`
- 작성 내용: HTTP 엔드포인트(라우터) 계층.
- 규칙:
  - `apis/v1/*.py`에 엔드포인트 정의
  - `apis/v1/__init__.py`에서 라우터 묶음 등록
  - 라우터에서는 비즈니스 로직을 최소화하고 `services` 호출 중심으로 작성

### `app/core/`
- 작성 내용: 전역 설정 및 공통 인프라 코드.
- 현재 기준:
  - `config.py`: 환경변수 기반 설정
  - `logger.py`: 로깅 설정

### `app/db/`
- 작성 내용: DB 연결/초기화, ORM 설정, 마이그레이션 연동.
- 현재 기준:
  - `databases.py`: Tortoise ORM 연결 정보 및 등록
  - `migrations/`: Aerich 마이그레이션 파일

### `app/models/`
- 작성 내용: DB 테이블 모델(Tortoise model), enum, 관계 정의.

### `app/dtos/`
- 작성 내용: 요청/응답 스키마(Pydantic), API 계약 모델.
- 원칙: 검증 규칙은 DTO/validator에 두고, DB 접근 로직은 넣지 않음.
- 예) 프론트에서 입력한 값을 형식, 타입 확인 후에 service(실제 일하는 사람)에 전달-검사필터
### `app/repositories/`
- 작성 내용: DB CRUD, 조회/필터링, 저장소 레벨 공통 쿼리.
- 원칙: ORM 직접 접근을 이 레이어로 모아 서비스 계층과 분리.
- 예) 데이터 저장/조회, db에 기록하는 직원

### `app/services/`
- 작성 내용: 유스케이스/비즈니스 로직, 트랜잭션 경계, 여러 저장소 조합.
- 현재 예시: 무엇을 할지 정하는
  - `auth.py`: 회원가입/로그인/인증 흐름
  - `users.py`: 사용자 정보 수정 로직
  - `jwt.py`: 토큰 발급/검증

### `app/dependencies/`
- 작성 내용: FastAPI `Depends` 함수(인증 사용자 주입 등).

### `app/validators/`
- 작성 내용: 도메인 입력 검증 규칙(형식, 범위, 정책 검사).

### `app/utils/`
- 작성 내용: 범용 유틸리티 함수.
- 현재 기준: `security.py`, `common.py`, `jwt/`(토큰/백엔드/예외 유틸).

### `app/tests/`
- 작성 내용: API/서비스 단위 테스트 및 테스트 픽스처.
- 현재 구조:
  - `auth_apis/`: 인증 API 테스트
  - `user_apis/`: 사용자 API 테스트
  - `conftest.py`: 공통 fixture/테스트 초기화

### `app/Dockerfile`, `app/.dockerignore`
- 작성 내용: app 컨테이너 빌드 규칙 및 빌드 제외 규칙.

---

## 3) `ai_worker/` (AI 작업 워커)

### `ai_worker/main.py`
- 작성 내용: 워커 프로세스 진입점(큐 소비 시작, 스케줄러 시작, 태스크 등록).
- 현재 상태: 비어 있음. 실제 실행 루프/consumer를 구현해야 함.

### `ai_worker/core/`
- 작성 내용: 워커 설정/로깅/공통 초기화.
- 현재 기준:
  - `config.py`: 워커 환경설정
  - `logger.py`: 워커 로거 설정

### `ai_worker/tasks/`
- 작성 내용: 실제 AI 처리 작업 함수(추론/후처리/실패 재시도 정책).
- 현재 상태: 비어 있음. 도메인별 task 모듈을 추가해야 함.

### `ai_worker/schemas/`
- 작성 내용: 워커 입출력 데이터 스키마(Pydantic 등), 메시지 계약 정의.
- 현재 상태: 비어 있음. 큐 메시지/작업 파라미터 모델을 추가해야 함.

### `ai_worker/Dockerfile`, `ai_worker/.dockerignore`
- 작성 내용: 워커 컨테이너 빌드 규칙 및 빌드 제외 규칙.

---

## 4) 새 기능 추가 시 작성 위치 빠른 기준

- API URL을 추가한다: `app/apis/v1/` + 필요 DTO(`app/dtos/`) + 서비스(`app/services/`) + 테스트(`app/tests/`)
- DB 스키마가 바뀐다: `app/models/` 수정 후 `app/db/migrations/` 생성
- 인증/권한 로직을 바꾼다: `app/dependencies/`, `app/services/auth.py`, `app/services/jwt.py`
- AI 추론 작업을 추가한다: `ai_worker/tasks/` + `ai_worker/schemas/` + `ai_worker/main.py` 등록
- 배포/운영 구성을 바꾼다: `docker-compose*.yml`, `nginx/`, `scripts/`, `envs/`

