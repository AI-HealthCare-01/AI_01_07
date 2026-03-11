from fastapi import APIRouter

from app.apis.v1.admin_routers import admin_router
from app.apis.v1.auth_routers import auth_router
from app.apis.v1.challenge_routers import challenge_router
from app.apis.v1.dashboard_routers import dashboard_router
from app.apis.v1.food_routers import food_router
from app.apis.v1.health_record_routers import health_record_router
from app.apis.v1.meal_routers import meal_router
from app.apis.v1.notification_routers import notification_router
from app.apis.v1.onboarding_routers import onboarding_router
from app.apis.v1.prediction_routers import prediction_router
from app.apis.v1.user_routers import user_router

v1_routers = APIRouter(prefix="/api/v1")
v1_routers.include_router(admin_router)
v1_routers.include_router(auth_router)
v1_routers.include_router(challenge_router)
v1_routers.include_router(health_record_router)
v1_routers.include_router(user_router)
v1_routers.include_router(dashboard_router)
v1_routers.include_router(food_router)
v1_routers.include_router(prediction_router)
v1_routers.include_router(meal_router)
v1_routers.include_router(onboarding_router)
v1_routers.include_router(notification_router)
