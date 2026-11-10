from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.api import (
    admin,
    auth,
    contact,
    orders,
    payments,
    products,
    wishlist,
)
from app.core.config import settings
from app.core.database import Base, engine
from app.core.logging import setup_logging
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.request_id import RequestIdMiddleware
from app.middleware.security import SecurityHeadersMiddleware
from app.seed import seed_database

setup_logging()
logger = logging.getLogger("customgift.main")


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.media_root.mkdir(parents=True, exist_ok=True)
    (settings.media_root / "products").mkdir(
        parents=True,
        exist_ok=True,
    )
    (settings.media_root / "customizations").mkdir(
        parents=True,
        exist_ok=True,
    )

    if settings.app_env == "development":
        # SQLite can create its schema automatically during development.
        # PostgreSQL schema changes are managed only through Alembic.
        if settings.database_url.startswith("sqlite"):
            Base.metadata.create_all(bind=engine)

        seed_database()

    yield


app = FastAPI(
    title=settings.app_name,
    version="2.0.0",
    description="REST API for the CustomGift personalized e-commerce platform.",
    lifespan=lifespan,
)

# Custom Middlewares
app.add_middleware(RequestIdMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount(
    "/media/products",
    StaticFiles(
        directory=settings.media_root / "products",
        check_dir=False,
    ),
    name="product-media",
)

# API routes
app.include_router(
    auth.router,
    prefix=settings.api_prefix,
)

app.include_router(
    products.router,
    prefix=settings.api_prefix,
)

app.include_router(
    wishlist.router,
    prefix=settings.api_prefix,
)

app.include_router(
    orders.router,
    prefix=settings.api_prefix,
)

app.include_router(
    payments.router,
    prefix=settings.api_prefix,
)

app.include_router(
    admin.router,
    prefix=settings.api_prefix,
)

app.include_router(
    contact.router,
    prefix=settings.api_prefix,
)


@app.get("/")
def root():
    return {
        "name": settings.app_name,
        "version": "2.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    """Liveness probe: verifies process is alive and accepting HTTP traffic."""
    return {
        "status": "ok",
    }


@app.get("/health/ready")
def readiness():
    """Readiness probe: verifies backend can connect to and query database."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {
            "status": "ready",
            "database": "connected",
        }
    except Exception as exc:
        logger.error("Readiness check failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is not ready",
        )
