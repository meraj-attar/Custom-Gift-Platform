from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import ContactMessage
from app.schemas.common import ContactCreate, MessageResponse


router = APIRouter(prefix="/contact", tags=["Contact"])


@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_message(payload: ContactCreate, db: Session = Depends(get_db)):
    db.add(ContactMessage(**payload.model_dump()))
    db.commit()
    return MessageResponse(message="Thanks! Your message has been received.")
