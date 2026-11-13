from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.settings_service import get_whatsapp_config

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("/whatsapp")
def get_public_whatsapp_settings(db: Session = Depends(get_db)):
    """
    Public endpoint providing WhatsApp contact settings and message templates
    for the customer storefront.
    """
    return get_whatsapp_config(db)
