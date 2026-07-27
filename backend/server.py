"""Smart Restaurant Management System — FastAPI entry point.

All domain logic lives in `routes/`. This file only wires the app together:
- loads env
- mounts all routers under /api
- CORS + startup seed
"""
import os
import logging
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from db import client, db, OWNER_EMAIL  # noqa: E402
from routes.auth import router as auth_router  # noqa: E402
from routes.menu import router as menu_router  # noqa: E402
from routes.orders import router as orders_router  # noqa: E402
from routes.tables import router as tables_router  # noqa: E402
from routes.reservations import router as reservations_router  # noqa: E402
from routes.inventory import router as inventory_router  # noqa: E402
from routes.staff import router as staff_router  # noqa: E402
from routes.analytics import router as analytics_router  # noqa: E402
from routes.ai import router as ai_router  # noqa: E402
from notifications import router as notifications_router  # noqa: E402


app = FastAPI(title="Smart Restaurant API")

# Every domain router is mounted under /api
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"service": "Smart Restaurant API", "status": "ok"}


@api.post("/dev/seed")
async def seed_endpoint():
    from seed_data import seed
    return await seed(db, OWNER_EMAIL)


api.include_router(auth_router)
api.include_router(menu_router)
api.include_router(orders_router)
api.include_router(tables_router)
api.include_router(reservations_router)
api.include_router(inventory_router)
api.include_router(staff_router)
api.include_router(analytics_router)
api.include_router(ai_router)
api.include_router(notifications_router)

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    from seed_data import seed
    await seed(db, OWNER_EMAIL)
    logger.info("Startup seed complete")


@app.on_event("shutdown")
async def shutdown():
    client.close()
