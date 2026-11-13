import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings
from app.core.validators import validate_and_normalize_email

logger = logging.getLogger(__name__)


def send_password_reset_otp_email(recipient: str, otp: str, expires_minutes: int = 5) -> bool:
    """
    Sends a 6-digit verification code for password recovery using standard SMTP.
    Features professional CustomGift branding, plain-text fallback, and HTML rendering.
    """
    try:
        clean_recipient = validate_and_normalize_email(recipient)
    except ValueError as exc:
        logger.error("Failed to send OTP email due to invalid recipient email: %s", exc)
        return False

    # Check SMTP configuration
    if not settings.smtp_configured:
        logger.error(
            "SMTP service is not configured. Real email delivery requires SMTP_HOST, "
            "SMTP_PORT, SMTP_USERNAME, and SMTP_PASSWORD in the server environment."
        )
        return False

    from_name = getattr(settings, "smtp_from_name", "CustomGift") or "CustomGift"
    from_email = settings.smtp_from_email or settings.smtp_username
    from_header = f"{from_name} <{from_email}>"

    message = EmailMessage()
    message["Subject"] = "Reset Your CustomGift Password"
    message["From"] = from_header
    message["To"] = clean_recipient

    # Plain text version
    plain_text = (
        f"CustomGift Password Recovery\n"
        f"============================\n\n"
        f"Your 6-digit verification code is:\n\n"
        f"    {otp}\n\n"
        f"This code will expire in {expires_minutes} minutes.\n\n"
        f"If you did not request a password reset, please ignore this email. "
        f"Your CustomGift account remains secure.\n\n"
        f"— The CustomGift Team\n"
        f"https://customgift.dev"
    )
    message.set_content(plain_text)

    # HTML version
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your CustomGift Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1d1730;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f7f5fa; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e9e4ef; box-shadow: 0 10px 30px rgba(42, 28, 73, 0.06); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6d3df5, #9d6cff); padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">CustomGift</h1>
              <p style="margin: 6px 0 0; color: #e8dcff; font-size: 13px; font-weight: 500;">Thoughtful Personalized Gifts</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 36px 32px 28px;">
              <h2 style="margin: 0 0 12px; font-size: 20px; color: #1d1730; font-weight: 700;">Password Reset Verification</h2>
              <p style="margin: 0 0 24px; color: #6e687d; font-size: 15px; line-height: 1.6;">
                We received a request to reset your CustomGift password. Use the 6-digit verification code below to complete the reset process:
              </p>
              
              <!-- OTP Box -->
              <div style="background-color: #f5f0ff; border: 2px dashed #bba1fa; border-radius: 14px; padding: 20px; text-align: center; margin: 28px 0;">
                <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #5b21b6; display: inline-block;">
                  {otp}
                </span>
                <p style="margin: 10px 0 0; font-size: 12px; color: #797184; font-weight: 600;">
                  ⏱ Valid for {expires_minutes} minutes
                </p>
              </div>

              <!-- Security notice -->
              <div style="background-color: #fffaf5; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 12px 16px; margin: 20px 0;">
                <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
                  <strong>Security Note:</strong> Never share this code with anyone. CustomGift support will never ask for your verification code.
                </p>
              </div>

              <p style="margin: 24px 0 0; color: #8e889d; font-size: 13px; line-height: 1.5;">
                If you did not request this password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="border-top: 1px solid #f0ebf5; padding: 20px 32px; text-align: center; background-color: #faf8fd;">
              <p style="margin: 0; color: #9e98ad; font-size: 12px;">
                © 2026 CustomGift. Crafted with care.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
    message.add_alternative(html_content, subtype="html")

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            if settings.smtp_use_tls:
                server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
        logger.info("Successfully sent password reset OTP email to %s", clean_recipient)
        return True
    except Exception as exc:
        logger.error("Failed to send password reset OTP via SMTP to %s: %s", clean_recipient, exc)
        return False


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

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
        return True
    except Exception as exc:
        logger.error("Failed to send password reset email via SMTP: %s", exc)
        return False


def send_contact_notification_email(name: str, email: str, subject: str, message_body: str) -> bool:
    """
    Sends an admin notification email when a customer submits a contact message.
    Gracefully handles failure without raising exceptions.
    """
    if not all([settings.smtp_host, settings.smtp_username, settings.smtp_password, settings.smtp_from_email]):
        return False

    try:
        clean_from = validate_and_normalize_email(settings.smtp_from_email)
        admin_email = clean_from
    except Exception as exc:
        logger.error("Failed to prepare admin notification email: %s", exc)
        return False

    message = EmailMessage()
    message["Subject"] = f"[CustomGift] New Contact: {subject}"
    message["From"] = clean_from
    message["To"] = admin_email
    message.set_content(
        f"You have received a new contact submission on CustomGift:\n\n"
        f"Name: {name}\n"
        f"Email: {email}\n"
        f"Subject: {subject}\n\n"
        f"Message:\n{message_body}\n\n"
        f"— CustomGift Operations"
    )

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
        return True
    except Exception as exc:
        logger.error("Failed to send contact notification email via SMTP: %s", exc)
        return False


def send_contact_acknowledgement_email(name: str, recipient: str, subject: str) -> bool:
    """
    Sends a friendly acknowledgement email to the customer who submitted the contact form.
    Gracefully handles failure without raising exceptions.
    """
    if not all([settings.smtp_host, settings.smtp_username, settings.smtp_password, settings.smtp_from_email]):
        return False

    try:
        clean_from = validate_and_normalize_email(settings.smtp_from_email)
        clean_recipient = validate_and_normalize_email(recipient)
    except Exception as exc:
        logger.error("Failed to prepare customer acknowledgement email: %s", exc)
        return False

    message = EmailMessage()
    message["Subject"] = f"We received your message: {subject}"
    message["From"] = clean_from
    message["To"] = clean_recipient
    message.set_content(
        f"Hi {name},\n\n"
        f"Thank you for contacting CustomGift! We have received your inquiry regarding '{subject}'.\n\n"
        f"Our support team typically reviews inquiries and replies within 24 business hours.\n\n"
        f"Warm regards,\n"
        f"The CustomGift Support Team\n"
        f"hello@customgift.dev"
    )

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
        return True
    except Exception as exc:
        logger.error("Failed to send customer acknowledgement email via SMTP: %s", exc)
        return False
