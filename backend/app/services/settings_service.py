from typing import Any
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import StoreSetting

DEFAULT_SETTINGS = {
    "whatsapp_number": "8485089678",
    "whatsapp_country_code": "91",
    "whatsapp_available": "true",
    "whatsapp_enquiry_template": "Hi, I am interested in customizing this product. Please share the available customization options and pricing.\n\nProduct Name: {title}\nProduct ID: {id}\nProduct URL: {url}",
    "store_name": "CustomGift",
    "store_email": "support@customgift.dev",
    "store_phone": "+91 84850 89678",
}


def get_setting(db: Session, key: str, default: str | None = None) -> str:
    setting = db.scalar(select(StoreSetting).where(StoreSetting.key == key))
    if setting:
        return setting.value
    return DEFAULT_SETTINGS.get(key, default or "")


def get_all_settings(db: Session) -> dict[str, str]:
    results = dict(DEFAULT_SETTINGS)
    records = db.scalars(select(StoreSetting)).all()
    for rec in records:
        results[rec.key] = rec.value
    return results


def set_setting(db: Session, key: str, value: str, description: str | None = None) -> StoreSetting:
    setting = db.scalar(select(StoreSetting).where(StoreSetting.key == key))
    if not setting:
        setting = StoreSetting(key=key, value=value, description=description)
        db.add(setting)
    else:
        setting.value = value
        if description:
            setting.description = description
    db.commit()
    db.refresh(setting)
    return setting


def update_bulk_settings(db: Session, items: dict[str, str]) -> dict[str, str]:
    for key, value in items.items():
        set_setting(db, key, str(value).strip())
    return get_all_settings(db)


def get_whatsapp_config(db: Session) -> dict[str, Any]:
    settings = get_all_settings(db)
    num = settings.get("whatsapp_number", "8485089678").strip()
    cc = settings.get("whatsapp_country_code", "91").strip()
    full_number = f"{cc}{num}" if not num.startswith(cc) else num
    return {
        "number": num,
        "country_code": cc,
        "full_number": full_number,
        "display_number": f"+{cc} {num}",
        "available": settings.get("whatsapp_available", "true").lower() == "true",
        "enquiry_template": settings.get("whatsapp_enquiry_template", ""),
    }
