import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings
from app.core.validators import validate_and_normalize_email

logger = logging.getLogger(__name__)


def send_password_reset_email(recipient: str, reset_url: str) -> bool:
    """
    Sends password reset email via SMTP with CRLF and injection protection.
    """
    if not all([settings.smtp_host, settings.smtp_username, settings.smtp_password, settings.smtp_from_email]):
        return False

    try:
        clean_recipient = validate_and_normalize_email(recipient)
        clean_from = validate_and_normalize_email(settings.smtp_from_email)
    except ValueError as exc:
        logger.error("Failed to send email due to invalid email address: %s", exc)
        return False

    message = EmailMessage()
    message["Subject"] = "Reset your CustomGift password"
    message["From"] = clean_from
    message["To"] = clean_recipient
    message.set_content(
        f"Hello,\n\n"
        f"We received a request to reset your CustomGift account password.\n"
        f"Use this secure link to set your new password:\n\n"
        f"{reset_url}\n\n"
        f"This link expires in {settings.password_reset_expire_minutes} minutes.\n"
        f"If you did not make this request, please disregard this email.\n\n"
        f"— CustomGift Security Team"
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
        server.starttls()
        server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(message)
    return True
