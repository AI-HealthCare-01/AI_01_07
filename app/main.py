from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.responses import RedirectResponse

from app.apis.v1 import v1_routers
from app.core import config
from app.db.databases import initialize_tortoise
from app.services.notification_scheduler import NotificationScheduler

scheduler = NotificationScheduler()


@asynccontextmanager
async def app_lifespan(_: FastAPI):
    if config.NOTIFICATION_SCHEDULER_ENABLED:
        await scheduler.start()
    try:
        yield
    finally:
        if config.NOTIFICATION_SCHEDULER_ENABLED:
            await scheduler.stop()


app = FastAPI(
    default_response_class=ORJSONResponse,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=app_lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

initialize_tortoise(app)

app.include_router(v1_routers)


@app.get("/", include_in_schema=False)
async def root_redirect() -> RedirectResponse:
    return RedirectResponse(url="/api/docs")


@app.get("/docs", include_in_schema=False)
async def docs_redirect() -> RedirectResponse:
    return RedirectResponse(url="/api/docs")


@app.get("/redoc", include_in_schema=False)
async def redoc_redirect() -> RedirectResponse:
    return RedirectResponse(url="/api/redoc")


@app.get("/openapi.json", include_in_schema=False)
async def openapi_redirect() -> RedirectResponse:
    return RedirectResponse(url="/api/openapi.json")


@app.get("/.well-known/appspecific/com.chrome.devtools.json", include_in_schema=False)
async def chrome_devtools_probe() -> Response:
    return Response(status_code=204)


BASE_DIR = Path(__file__).resolve().parent
app.mount("/dashboard", StaticFiles(directory=BASE_DIR / "static" / "dashboard", html=True), name="dashboard")
