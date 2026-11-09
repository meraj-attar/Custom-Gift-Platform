import smtplib
from email.message import EmailMessage

from app.core.config import settings


def send_password_reset_email(recipient: str, reset_url: str) -> bool:
    if not all([settings.smtp_host, settings.smtp_username, settings.smtp_password, settings.smtp_from_email]):
        return False

    message = EmailMessage()
    message["Subject"] = "Reset your CustomGift password"
    message["From"] = settings.smtp_from_email
    message["To"] = recipient
    message.set_content(f"Use this secure link to reset your password: {reset_url}\n\nThis link expires shortly.")

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
        server.starttls()
        server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(message)
    return True
