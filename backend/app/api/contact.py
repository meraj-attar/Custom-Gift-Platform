from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import ContactMessage
from app.schemas.common import ContactCreate, MessageResponse
from app.services.email_service import (
    send_contact_acknowledgement_email,
    send_contact_notification_email,
)

router = APIRouter(prefix="/contact", tags=["Contact"])


@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_message(
    payload: ContactCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # 1. Honeypot check: if filled by an automated bot, silently return success without persisting
    if payload.honeypot:
        return MessageResponse(message="Thanks! Your message has been received.")

    # 2. Duplicate submission protection: reject identical submission from same email within 60 seconds
    recent_cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=60)
    existing_duplicate = db.scalar(
        select(ContactMessage).where(
            ContactMessage.email == payload.email,
            ContactMessage.subject == payload.subject,
            ContactMessage.message == payload.message,
            ContactMessage.created_at >= recent_cutoff,
        )
    )
    if existing_duplicate:
        return MessageResponse(
            message="Your message has already been received. Our team will get back to you shortly."
        )

    # 3. Create and persist contact submission
    new_message = ContactMessage(
        name=payload.name,
        email=payload.email,
        subject=payload.subject,
        message=payload.message,
        status="New",
        is_read=False,
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)

    # 4. Dispatch asynchronous email notifications if SMTP is configured
    background_tasks.add_task(
        send_contact_notification_email,
        name=payload.name,
        email=payload.email,
        subject=payload.subject,
        message_body=payload.message,
    )
    background_tasks.add_task(
        send_contact_acknowledgement_email,
        name=payload.name,
        recipient=payload.email,
        subject=payload.subject,
    )

    return MessageResponse(message="Thanks! Your message has been received.")
