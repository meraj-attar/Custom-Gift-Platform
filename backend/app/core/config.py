from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CustomGift API"
    app_env: str = "development"
    debug: bool = True
    api_prefix: str = "/api"
    secret_key: str = "development-only-change-me-please-32-bytes"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    password_reset_expire_minutes: int = 20

    database_url: str = "sqlite:///./customgift.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173 , https://kit-supply-route-trace.trycloudflare.com "
    frontend_url: str = "http://localhost:5173"

    razorpay_key_id: str | None = None
    razorpay_key_secret: str | None = None
    payment_demo_mode: bool = True

    cloudinary_cloud_name: str | None = None
    cloudinary_api_key: str | None = None
    cloudinary_api_secret: str | None = None

    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None

    admin_name: str = "CustomGift Admin"
    admin_email: str = "admin@customgift.dev"
    admin_password: str = "Admin@123"

    media_root: Path = Path("media")
    max_upload_mb: int = 5

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def razorpay_configured(self) -> bool:
        return bool(self.razorpay_key_id and self.razorpay_key_secret)

    @property
    def cloudinary_configured(self) -> bool:
        return bool(self.cloudinary_cloud_name and self.cloudinary_api_key and self.cloudinary_api_secret)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
