FROM python:3.13-slim

WORKDIR /app

# 1. uv 설치 (공식 이미지에서 복사해오는 가장 깔끔한 방법)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# 2. 의존성 패키지 관리 파일을 컨테이너 내부에 복사합니다.
COPY pyproject.toml uv.lock ./

# 3. ai 그룹 의존성 설치 후, 워커 서버 실행에 필요한 FastAPI/Uvicorn만 추가 설치합니다.
RUN uv sync --group ai --no-dev --frozen \
    && uv pip install --python .venv/bin/python "fastapi[standard]>=0.128.0" "uvicorn>=0.40.0" "autogluon.tabular==1.5.0" "fastai>=2.8.0" "ipython>=9.0.0"

# 4. 로컬 소스 코드를 컨테이너 내부로 복사합니다.
COPY ./ai_worker ./app

# 5. 해당 이미지를 활용하여 도커컨테이너 실행시 실행되는 명령어입니다.
# 아래 커맨드를 수정한 뒤에 사용합니다.
CMD ["echo", "'hello world'"]
