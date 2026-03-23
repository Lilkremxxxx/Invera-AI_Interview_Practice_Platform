import asyncio
import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings


logger = logging.getLogger(__name__)


def _sender_email() -> str:
    return settings.smtp_sender_email or settings.smtp_username or "no-reply@invera.pp.ua"


def _send_email_sync(recipient: str, subject: str, body_text: str, body_html: str | None = None) -> None:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{settings.smtp_sender_name} <{_sender_email()}>"
    message["To"] = recipient
    message.set_content(body_text)
    if body_html:
        message.add_alternative(body_html, subtype="html")

    if settings.smtp_use_ssl:
        server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=30)
    else:
        server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30)

    with server:
        if settings.smtp_use_tls and not settings.smtp_use_ssl:
            server.starttls()
        if settings.smtp_username and settings.smtp_password:
            server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(message)


async def send_verification_email(recipient: str, code: str) -> None:
    subject = "Verify your Invera account"
    body_text = (
        "Hello,\n\n"
        "Thanks for signing up for Invera.\n"
        f"Your verification code is: {code}\n"
        f"This code stays valid for {settings.verification_code_ttl_minutes} minutes.\n"
        f"You can request a new code every {settings.verification_resend_cooldown_seconds} seconds.\n\n"
        "If you did not request this account, you can ignore this email.\n"
    )
    body_html = (
        "<!DOCTYPE html>"
        "<html lang='en'>"
        "<head>"
        "<meta http-equiv='Content-Type' content='text/html; charset=utf-8'>"
        "<meta name='viewport' content='width=device-width, initial-scale=1.0'>"
        "<meta name='color-scheme' content='light'>"
        "<meta name='supported-color-schemes' content='light'>"
        "</head>"
        "<body style='margin:0;padding:0;background-color:#edf4f7;background:#edf4f7;font-family:Arial,sans-serif;color:#0f172a;'>"
        "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' bgcolor='#edf4f7' style='background-color:#edf4f7;background:#edf4f7;padding:24px 12px;'>"
        "<tr><td align='center'>"
        "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' bgcolor='#ffffff' style='max-width:620px;background-color:#ffffff;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #d6e2ea;'>"
        "<tr>"
        "<td bgcolor='#f2fbfb' style='padding:28px 32px 24px;background-color:#f2fbfb;background:#f2fbfb;border-bottom:1px solid #d6eef0;'>"
        "<div style='font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#0f766e;font-weight:700;margin-bottom:14px;'>Invera</div>"
        "<div style='font-size:32px;line-height:1.15;font-weight:800;margin:0 0 12px;color:#0f172a;'>Verify your email</div>"
        "<div style='font-size:16px;line-height:1.7;color:#33536a;margin:0;'>Use the 6-digit code below to activate your account and protect your sign-in.</div>"
        "</td>"
        "</tr>"
        "<tr><td bgcolor='#ffffff' style='padding:32px;background-color:#ffffff;background:#ffffff;'>"
        "<div style='font-size:16px;line-height:1.7;color:#334155;margin-bottom:18px;'>Hello,</div>"
        "<div style='font-size:16px;line-height:1.7;color:#334155;margin-bottom:24px;'>Thanks for signing up for Invera. Enter this verification code on the verify-email screen to continue.</div>"
        "<div style='text-align:center;margin:28px 0;'>"
        f"<div role='presentation' aria-label='Verification code' style='display:inline-block;padding:16px 24px;border-radius:18px;background-color:#ffffff;background:#ffffff;border:2px solid #8ddae2;'>"
        f"<div style='font-size:34px;line-height:1;letter-spacing:0.36em;padding-left:0.36em;font-weight:800;color:#0f172a;'>{code}</div>"
        "</div>"
        "</div>"
        "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='margin:12px 0 24px;'>"
        "<tr>"
        f"<td bgcolor='#f8fbfd' style='padding:14px 16px;border-radius:16px;background-color:#f8fbfd;background:#f8fbfd;border:1px solid #dbe7ef;font-size:14px;line-height:1.6;color:#475569;'>This code stays valid for <strong>{settings.verification_code_ttl_minutes} minutes</strong>. You can request a new code every <strong>{settings.verification_resend_cooldown_seconds} seconds</strong>.</td>"
        "</tr>"
        "</table>"
        "<div style='font-size:14px;line-height:1.7;color:#64748b;'>If you did not request this account, you can ignore this email. Please do not share this code with anyone.</div>"
        "<div style='margin-top:28px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:13px;line-height:1.7;color:#94a3b8;'>Invera • AI Interview Practice Platform</div>"
        "</td></tr></table>"
        "</td></tr></table>"
        "</body>"
        "</html>"
    )

    delivery_mode = settings.email_delivery_mode.lower()
    if delivery_mode == "disabled":
        raise RuntimeError("Email delivery is disabled")

    if delivery_mode == "log":
        logger.warning("Email verification code for %s: %s", recipient, code)
        return

    if delivery_mode != "smtp":
        raise RuntimeError(f"Unsupported EMAIL_DELIVERY_MODE: {settings.email_delivery_mode}")

    if not settings.smtp_host:
        raise RuntimeError("SMTP_HOST is not configured")

    await asyncio.to_thread(_send_email_sync, recipient, subject, body_text, body_html)


async def send_admin_invite_email(
    recipient: str,
    invite_link: str,
    invited_by_email: str,
    notes: str | None = None,
    mode: str = "signup",
    provider: str | None = None,
) -> None:
    subject = "Invera admin invitation"
    notes_line = f"Primary admin note: {notes}\n" if notes else ""
    if mode == "existing-login":
        action_intro = (
            "Your account already exists and has just been granted admin access.\n"
            "Open the link below to enter the admin area with your local email/password:\n"
        )
        action_hint = (
            f"If you previously signed in with {provider}, use the existing local password for this account here.\n"
            if provider and provider != "local"
            else ""
        )
        headline = "Admin access has been activated"
        body_title = "Your account already exists, so you can enter the admin area right away."
        button_label = "Open admin login"
        footer_note = (
            "The admin area only accepts local email/password sign-in. "
            "Google/GitHub is not used for admin access."
        )
    else:
        action_intro = (
            "To continue, open the link below to create your local admin account and verify your email:\n"
        )
        action_hint = "After account creation, you will receive the same 6-digit email verification code used in the regular sign-up flow.\n"
        headline = "You were invited to become an admin"
        body_title = "Create your local admin account with the link below, then verify your email with the normal code flow."
        button_label = "Create admin account"
        footer_note = (
            "For security, admin accounts still need local credentials and email verification. "
            "Google/GitHub is not used for admin access."
        )

    body_text = (
        "Hello,\n\n"
        f"{invited_by_email} has invited you to the Invera admin area.\n"
        f"{action_intro}"
        f"{invite_link}\n\n"
        f"{notes_line}"
        f"{action_hint}"
        "If you did not expect this invitation, you can ignore this email.\n"
    )
    notes_html = (
        f"<tr><td style='padding:0 0 18px;'>"
        f"<div style='padding:14px 16px;border-radius:16px;background:#f8fbfd;border:1px solid #dbe7ef;color:#475569;font-size:14px;line-height:1.6;'>"
        f"<strong style='color:#0f172a;'>Primary admin note:</strong><br>{notes}"
        f"</div></td></tr>"
        if notes
        else ""
    )
    body_html = (
        "<!DOCTYPE html>"
        "<html lang='en'>"
        "<head>"
        "<meta http-equiv='Content-Type' content='text/html; charset=utf-8'>"
        "<meta name='viewport' content='width=device-width, initial-scale=1.0'>"
        "<meta name='color-scheme' content='light'>"
        "<meta name='supported-color-schemes' content='light'>"
        "</head>"
        "<body style='margin:0;padding:0;background:#edf4f7;font-family:Arial,sans-serif;color:#0f172a;'>"
        "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' bgcolor='#edf4f7' style='background:#edf4f7;padding:24px 12px;'>"
        "<tr><td align='center'>"
        "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' bgcolor='#ffffff' style='max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #d6e2ea;'>"
        "<tr><td style='padding:30px 32px 24px;background:#f2fbfb;border-bottom:1px solid #d6eef0;'>"
        "<div style='font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#0f766e;font-weight:700;margin-bottom:14px;'>Invera Admin</div>"
        f"<div style='font-size:30px;line-height:1.15;font-weight:800;color:#0f172a;margin:0 0 12px;'>{headline}</div>"
        f"<div style='font-size:16px;line-height:1.7;color:#33536a;'>{body_title}</div>"
        "</td></tr>"
        "<tr><td style='padding:32px;'>"
        f"<table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='margin-bottom:22px;'><tr><td style='font-size:16px;line-height:1.7;color:#334155;'><strong style='color:#0f172a;'>{invited_by_email}</strong> just granted you access to the Invera admin area.</td></tr></table>"
        f"{notes_html}"
        "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='margin:24px 0 28px;'><tr><td align='center'>"
        f"<a href='{invite_link}' style='display:inline-block;padding:15px 26px;border-radius:16px;background:#14b8a6;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;'>{button_label}</a>"
        "</td></tr></table>"
        "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='margin-bottom:24px;'><tr><td style='padding:14px 16px;border-radius:16px;background:#f8fbfd;border:1px solid #dbe7ef;font-size:14px;line-height:1.7;color:#475569;'>If the button does not open correctly, use this fallback link:<br>"
        f"<a href='{invite_link}' style='color:#0f766e;text-decoration:none;font-weight:700;'>Access this link</a>"
        "</td></tr></table>"
        f"<div style='font-size:14px;line-height:1.7;color:#64748b;'>{footer_note}</div>"
        "<div style='margin-top:28px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:13px;line-height:1.7;color:#94a3b8;'>Invera • Admin access invitation</div>"
        "</td></tr></table>"
        "</td></tr></table>"
        "</body>"
        "</html>"
    )

    delivery_mode = settings.email_delivery_mode.lower()
    if delivery_mode == "disabled":
        raise RuntimeError("Email delivery is disabled")

    if delivery_mode == "log":
        logger.warning("Admin invite link for %s: %s", recipient, invite_link)
        return

    if delivery_mode != "smtp":
        raise RuntimeError(f"Unsupported EMAIL_DELIVERY_MODE: {settings.email_delivery_mode}")

    if not settings.smtp_host:
        raise RuntimeError("SMTP_HOST is not configured")

    await asyncio.to_thread(_send_email_sync, recipient, subject, body_text, body_html)
