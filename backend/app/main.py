from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

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
from app.seed import seed_database


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
    description=(
        "REST API for the CustomGift personalized "
        "e-commerce platform."
    ),
    lifespan=lifespan,
)


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
    return {
        "status": "ok",
    }