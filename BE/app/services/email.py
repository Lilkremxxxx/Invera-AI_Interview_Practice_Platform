import asyncio
import logging
import smtplib
from datetime import datetime
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
        "<meta name='color-scheme' content='dark'>"
        "<meta name='supported-color-schemes' content='dark'>"
        "</head>"
        "<body style='margin:0;padding:0;background-color:#090d16;background:#090d16;font-family:Arial,sans-serif;color:#cbd5e1;'>"
        "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' bgcolor='#090d16' style='background-color:#090d16;background:#090d16;padding:24px 12px;'>"
        "<tr><td align='center'>"
        "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' bgcolor='#111827' style='max-width:620px;background-color:#111827;background:#111827;border-radius:24px;overflow:hidden;border:1px solid #1e293b;'>"
        "<tr>"
        "<td bgcolor='#111827' style='padding:28px 32px 24px;background-color:#111827;background:#111827;border-bottom:1px solid #1e293b;'>"
        "<div style='font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#14b8a6;font-weight:700;margin-bottom:14px;'>Invera</div>"
        "<div style='font-size:32px;line-height:1.15;font-weight:800;margin:0 0 12px;color:#ffffff;'>Verify your email</div>"
        "<div style='font-size:16px;line-height:1.7;color:#94a3b8;margin:0;'>Use the 6-digit code below to activate your account and protect your sign-in.</div>"
        "</td>"
        "</tr>"
        "<tr><td bgcolor='#111827' style='padding:32px;background-color:#111827;background:#111827;'>"
        "<div style='font-size:16px;line-height:1.7;color:#cbd5e1;margin-bottom:18px;'>Hello,</div>"
        "<div style='font-size:16px;line-height:1.7;color:#cbd5e1;margin-bottom:24px;'>Thanks for signing up for Invera. Enter this verification code on the verify-email screen to continue.</div>"
        "<div style='text-align:center;margin:28px 0;'>"
        f"<div role='presentation' aria-label='Verification code' style='display:inline-block;padding:16px 24px;border-radius:18px;background-color:#1e293b;background:#1e293b;border:2px solid #14b8a6;'>"
        f"<div style='font-size:34px;line-height:1;letter-spacing:0.36em;padding-left:0.36em;font-weight:800;color:#ffffff;'>{code}</div>"
        "</div>"
        "</div>"
        "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='margin:12px 0 24px;'>"
        "<tr>"
        f"<td bgcolor='#1e293b' style='padding:14px 16px;border-radius:16px;background-color:#1e293b;background:#1e293b;border:1px solid #334155;font-size:14px;line-height:1.6;color:#cbd5e1;'>This code stays valid for <strong style='color:#ffffff;'>{settings.verification_code_ttl_minutes} minutes</strong>. You can request a new code every <strong style='color:#ffffff;'>{settings.verification_resend_cooldown_seconds} seconds</strong>.</td>"
        "</tr>"
        "</table>"
        "<div style='font-size:14px;line-height:1.7;color:#94a3b8;'>If you did not request this account, you can ignore this email. Please do not share this code with anyone.</div>"
        "<div style='margin-top:28px;padding-top:20px;border-top:1px solid #1e293b;font-size:13px;line-height:1.7;color:#64748b;'>Invera • AI Interview Practice Platform</div>"
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
            "OAuth sign-in is not used for admin access."
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
            "OAuth sign-in is not used for admin access."
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
        f"<div style='padding:14px 16px;border-radius:16px;background:#1e293b;border:1px solid #334155;color:#cbd5e1;font-size:14px;line-height:1.6;'>"
        f"<strong style='color:#ffffff;'>Primary admin note:</strong><br>{notes}"
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
        "<meta name='color-scheme' content='dark'>"
        "<meta name='supported-color-schemes' content='dark'>"
        "</head>"
        "<body style='margin:0;padding:0;background:#090d16;font-family:Arial,sans-serif;color:#cbd5e1;'>"
        "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' bgcolor='#090d16' style='background:#090d16;padding:24px 12px;'>"
        "<tr><td align='center'>"
        "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' bgcolor='#111827' style='max-width:640px;background:#111827;border-radius:24px;overflow:hidden;border:1px solid #1e293b;'>"
        "<tr><td style='padding:30px 32px 24px;background:#111827;border-bottom:1px solid #1e293b;'>"
        "<div style='font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#14b8a6;font-weight:700;margin-bottom:14px;'>Invera Admin</div>"
        f"<div style='font-size:30px;line-height:1.15;font-weight:800;color:#ffffff;margin:0 0 12px;'>{headline}</div>"
        f"<div style='font-size:16px;line-height:1.7;color:#94a3b8;'>{body_title}</div>"
        "</td></tr>"
        "<tr><td style='padding:32px;'>"
        f"<table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='margin-bottom:22px;'><tr><td style='font-size:16px;line-height:1.7;color:#cbd5e1;'><strong style='color:#ffffff;'>{invited_by_email}</strong> just granted you access to the Invera admin area.</td></tr></table>"
        f"{notes_html}"
        "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='margin:24px 0 28px;'><tr><td align='center'>"
        f"<a href='{invite_link}' style='display:inline-block;padding:15px 26px;border-radius:16px;background:#14b8a6;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;'>{button_label}</a>"
        "</td></tr></table>"
        "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='margin-bottom:24px;'><tr><td style='padding:14px 16px;border-radius:16px;background:#1e293b;border:1px solid #334155;font-size:14px;line-height:1.7;color:#cbd5e1;'>If the button does not open correctly, use this fallback link:<br>"
        f"<a href='{invite_link}' style='color:#14b8a6;text-decoration:none;font-weight:700;'>Access this link</a>"
        "</td></tr></table>"
        f"<div style='font-size:14px;line-height:1.7;color:#94a3b8;'>{footer_note}</div>"
        "<div style='margin-top:28px;padding-top:20px;border-top:1px solid #1e293b;font-size:13px;line-height:1.7;color:#64748b;'>Invera • Admin access invitation</div>"
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


async def send_password_reset_email(recipient: str, reset_link: str) -> None:
    subject = "Reset your Invera password"
    body_text = (
        "Hello,\n\n"
        "We received a request to reset your Invera password.\n"
        "Open the link below to choose a new password:\n"
        f"{reset_link}\n\n"
        "This link stays valid for 60 minutes.\n"
        "If you did not request a password reset, you can ignore this email.\n"
    )
    body_html = (
        "<!DOCTYPE html>"
        "<html lang='en'>"
        "<head>"
        "<meta http-equiv='Content-Type' content='text/html; charset=utf-8'>"
        "<meta name='viewport' content='width=device-width, initial-scale=1.0'>"
        "<meta name='color-scheme' content='dark'>"
        "<meta name='supported-color-schemes' content='dark'>"
        "</head>"
        "<body style='margin:0;padding:0;background:#090d16;font-family:Arial,sans-serif;color:#cbd5e1;'>"
        "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' bgcolor='#090d16' style='background:#090d16;padding:24px 12px;'>"
        "<tr><td align='center'>"
        "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' bgcolor='#111827' style='max-width:640px;background:#111827;border-radius:24px;overflow:hidden;border:1px solid #1e293b;'>"
        "<tr><td style='padding:30px 32px 24px;background:#111827;border-bottom:1px solid #1e293b;'>"
        "<div style='font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#14b8a6;font-weight:700;margin-bottom:14px;'>Invera</div>"
        "<div style='font-size:30px;line-height:1.15;font-weight:800;color:#ffffff;margin:0 0 12px;'>Reset your password</div>"
        "<div style='font-size:16px;line-height:1.7;color:#94a3b8;'>Use the secure link below to create a new password for your account.</div>"
        "</td></tr>"
        "<tr><td style='padding:32px;'>"
        "<div style='font-size:16px;line-height:1.7;color:#cbd5e1;margin-bottom:24px;'>If you asked to reset your password, continue with the button below.</div>"
        "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='margin:24px 0 28px;'><tr><td align='center'>"
        f"<a href='{reset_link}' style='display:inline-block;padding:15px 26px;border-radius:16px;background:#14b8a6;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;'>Reset password</a>"
        "</td></tr></table>"
        "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='margin-bottom:24px;'><tr><td style='padding:14px 16px;border-radius:16px;background:#1e293b;border:1px solid #334155;font-size:14px;line-height:1.7;color:#cbd5e1;'>"
        "This reset link stays valid for <strong style='color:#ffffff;'>60 minutes</strong>.<br>"
        f"If the button does not open correctly, use this fallback link:<br><a href='{reset_link}' style='color:#14b8a6;text-decoration:none;font-weight:700;'>Open password reset link</a>"
        "</td></tr></table>"
        "<div style='font-size:14px;line-height:1.7;color:#94a3b8;'>If you did not request this password reset, you can safely ignore this email.</div>"
        "<div style='margin-top:28px;padding-top:20px;border-top:1px solid #1e293b;font-size:13px;line-height:1.7;color:#64748b;'>Invera • Password reset</div>"
        "</td></tr></table>"
        "</td></tr></table>"
        "</body>"
        "</html>"
    )

    delivery_mode = settings.email_delivery_mode.lower()
    if delivery_mode == "disabled":
        raise RuntimeError("Email delivery is disabled")

    if delivery_mode == "log":
        logger.warning("Password reset link for %s: %s", recipient, reset_link)
        return

    if delivery_mode != "smtp":
        raise RuntimeError(f"Unsupported EMAIL_DELIVERY_MODE: {settings.email_delivery_mode}")

    if not settings.smtp_host:
        raise RuntimeError("SMTP_HOST is not configured")

    await asyncio.to_thread(_send_email_sync, recipient, subject, body_text, body_html)


async def send_payment_success_email(
    *,
    recipient: str,
    plan_tier: str,
    billing_period: str,
    amount_vnd: int,
    order_ref: str,
) -> None:
    plan_label = {
        "basic": "Basic",
        "pro": "Pro",
        "premium": "Premium",
    }.get(plan_tier, plan_tier.title())
    period_label = "tháng" if billing_period == "month" else "năm"
    amount_label = f"{amount_vnd:,.0f}".replace(",", ".")
    if plan_tier == "additional_sessions":
        try:
            quantity = int(billing_period)
        except (ValueError, TypeError):
            quantity = 1
        plan_label = "Mua thêm phiên"
        period_label = f"{quantity} phiên"
        subject = f"Invera xác nhận thanh toán mua thêm {quantity} phiên phỏng vấn"
        body_text = (
            "Xin chào,\n\n"
            f"Invera đã ghi nhận thanh toán thành công cho việc mua thêm {quantity} phiên phỏng vấn.\n"
            f"Số tiền: {amount_label} VND\n"
            f"Mã đơn hàng: {order_ref}\n\n"
            "Tài khoản của bạn đã được cộng thêm phiên phỏng vấn thành công. Cảm ơn bạn đã sử dụng dịch vụ của Invera.\n\n"
            "Invera\n"
        )
        body_html = (
            "<!DOCTYPE html>"
            "<html lang='vi'>"
            "<head>"
            "<meta http-equiv='Content-Type' content='text/html; charset=utf-8'>"
            "<meta name='viewport' content='width=device-width, initial-scale=1.0'>"
            "<meta name='color-scheme' content='dark'>"
            "<meta name='supported-color-schemes' content='dark'>"
            "</head>"
            "<body style='margin:0;padding:0;background:#090d16;font-family:Arial,sans-serif;color:#cbd5e1;'>"
            "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' bgcolor='#090d16' style='background:#090d16;padding:24px 12px;'>"
            "<tr><td align='center'>"
            "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' bgcolor='#111827' style='max-width:640px;background:#111827;border-radius:24px;overflow:hidden;border:1px solid #1e293b;'>"
            "<tr><td bgcolor='#111827' style='padding:28px 32px 24px;background-color:#111827;background:#111827;border-bottom:1px solid #1e293b;'>"
            "<div style='font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#14b8a6;font-weight:700;margin-bottom:14px;'>Invera</div>"
            "<div style='font-size:32px;line-height:1.15;font-weight:800;margin:0 0 12px;color:#ffffff;'>Thanh toán thành công</div>"
            f"<div style='font-size:16px;line-height:1.7;color:#94a3b8;margin:0;'>Đã cộng thêm {quantity} phiên phỏng vấn vào tài khoản của bạn.</div>"
            "</td></tr>"
            "<tr><td bgcolor='#111827' style='padding:32px;background-color:#111827;background:#111827;'>"
            "<div style='font-size:16px;line-height:1.7;color:#cbd5e1;margin-bottom:18px;'>Xin chào,</div>"
            "<div style='font-size:16px;line-height:1.7;color:#cbd5e1;margin-bottom:24px;'>\n"
            f"Invera đã ghi nhận giao dịch thanh toán thành công của bạn cho việc <strong>mua thêm {quantity} phiên phỏng vấn</strong>."
            "</div>"
            "<div style='text-align:center;margin:28px 0;'>"
            "<div role='presentation' aria-label='Paid amount' style='display:inline-block;padding:20px 32px;border-radius:20px;background-color:#1e293b;background:#1e293b;border:2px solid #14b8a6;text-align:center;'>"
            "<div style='font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:6px;font-weight:600;'>Tổng tiền đã thanh toán</div>"
            f"<div style='font-size:32px;line-height:1;font-weight:800;color:#14b8a6;'>{amount_label} VND</div>"
            "</div>"
            "</div>"
            "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='margin:12px 0 24px;border-collapse:separate;border-spacing:0;background-color:#1e293b;background:#1e293b;border-radius:18px;border:1px solid #334155;overflow:hidden;'>"
            "<tr>"
            "<td style='padding:14px 20px;border-bottom:1px solid #334155;font-size:14px;color:#94a3b8;'>Dịch vụ</td>"
            f"<td style='padding:14px 20px;border-bottom:1px solid #334155;font-size:14px;color:#ffffff;font-weight:700;text-align:right;'>Mua thêm {quantity} phiên phỏng vấn</td>"
            "</tr>"
            "<tr>"
            "<td style='padding:14px 20px;font-size:14px;color:#94a3b8;'>Mã đơn hàng</td>"
            f"<td style='padding:14px 20px;font-size:14px;color:#ffffff;font-family:monospace;text-align:right;'>{order_ref}</td>"
            "</tr>"
            "</table>"
            "<div style='font-size:16px;line-height:1.7;color:#cbd5e1;'>"
            "Cảm ơn bạn đã sử dụng dịch vụ của Invera. Chúc bạn luyện tập phỏng vấn đạt kết quả thật tốt!"
            "</div>"
            "<div style='margin-top:28px;padding-top:20px;border-top:1px solid #1e293b;font-size:13px;line-height:1.7;color:#64748b;'>Invera • AI Interview Practice Platform</div>"
            "</td></tr></table>"
            "</td></tr></table>"
            "</body>"
            "</html>"
        )
    else:
        plan_label = {
            "basic": "Basic",
            "pro": "Pro",
            "premium": "Premium",
        }.get(plan_tier, plan_tier.title())
        period_label = "tháng" if billing_period == "month" else "năm"
        subject = f"Invera xác nhận thanh toán gói {plan_label}"
        body_text = (
            "Xin chào,\n\n"
            f"Invera đã ghi nhận thanh toán thành công cho gói {plan_label} theo {period_label}.\n"
            f"Số tiền: {amount_label} VND\n"
            f"Mã đơn hàng: {order_ref}\n\n"
            "Tài khoản của bạn đã được nâng cấp. Cảm ơn bạn đã sử dụng dịch vụ của Invera.\n\n"
            "Invera\n"
        )
        body_html = (
            "<!DOCTYPE html>"
            "<html lang='vi'>"
            "<head>"
            "<meta http-equiv='Content-Type' content='text/html; charset=utf-8'>"
            "<meta name='viewport' content='width=device-width, initial-scale=1.0'>"
            "<meta name='color-scheme' content='dark'>"
            "<meta name='supported-color-schemes' content='dark'>"
            "</head>"
            "<body style='margin:0;padding:0;background:#090d16;font-family:Arial,sans-serif;color:#cbd5e1;'>"
            "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' bgcolor='#090d16' style='background:#090d16;padding:24px 12px;'>"
            "<tr><td align='center'>"
            "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' bgcolor='#111827' style='max-width:640px;background:#111827;border-radius:24px;overflow:hidden;border:1px solid #1e293b;'>"
            "<tr><td bgcolor='#111827' style='padding:28px 32px 24px;background-color:#111827;background:#111827;border-bottom:1px solid #1e293b;'>"
            "<div style='font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#14b8a6;font-weight:700;margin-bottom:14px;'>Invera</div>"
            "<div style='font-size:32px;line-height:1.15;font-weight:800;margin:0 0 12px;color:#ffffff;'>Thanh toán thành công</div>"
            f"<div style='font-size:16px;line-height:1.7;color:#94a3b8;margin:0;'>Tài khoản của bạn đã được kích hoạt gói {plan_label}.</div>"
            "</td></tr>"
            "<tr><td bgcolor='#111827' style='padding:32px;background-color:#111827;background:#111827;'>"
            "<div style='font-size:16px;line-height:1.7;color:#cbd5e1;margin-bottom:18px;'>Xin chào,</div>"
            "<div style='font-size:16px;line-height:1.7;color:#cbd5e1;margin-bottom:24px;'>\n"
            f"Invera đã ghi nhận giao dịch thanh toán thành công của bạn cho gói <strong>{plan_label}</strong> theo {period_label}."
            "</div>"
            "<div style='text-align:center;margin:28px 0;'>"
            "<div role='presentation' aria-label='Paid amount' style='display:inline-block;padding:20px 32px;border-radius:20px;background-color:#1e293b;background:#1e293b;border:2px solid #14b8a6;text-align:center;'>"
            "<div style='font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:6px;font-weight:600;'>Tổng tiền đã thanh toán</div>"
            f"<div style='font-size:32px;line-height:1;font-weight:800;color:#14b8a6;'>{amount_label} VND</div>"
            "</div>"
            "</div>"
            "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='margin:12px 0 24px;border-collapse:separate;border-spacing:0;background-color:#1e293b;background:#1e293b;border-radius:18px;border:1px solid #334155;overflow:hidden;'>"
            "<tr>"
            "<td style='padding:14px 20px;border-bottom:1px solid #334155;font-size:14px;color:#94a3b8;'>Gói dịch vụ</td>"
            f"<td style='padding:14px 20px;border-bottom:1px solid #334155;font-size:14px;color:#ffffff;font-weight:700;text-align:right;'>{plan_label} ({period_label})</td>"
            "</tr>"
            "<tr>"
            "<td style='padding:14px 20px;font-size:14px;color:#94a3b8;'>Mã đơn hàng</td>"
            f"<td style='padding:14px 20px;font-size:14px;color:#ffffff;font-family:monospace;text-align:right;'>{order_ref}</td>"
            "</tr>"
            "</table>"
            "<div style='font-size:16px;line-height:1.7;color:#cbd5e1;'>"
            "Cảm ơn bạn đã nâng cấp dịch vụ. Chúc bạn có những phiên luyện tập phỏng vấn AI thật hiệu quả!"
            "</div>"
            "<div style='margin-top:28px;padding-top:20px;border-top:1px solid #1e293b;font-size:13px;line-height:1.7;color:#64748b;'>Invera • AI Interview Practice Platform</div>"
            "</td></tr></table>"
            "</td></tr></table>"
            "</body>"
            "</html>"
        )

    delivery_mode = settings.email_delivery_mode.lower()
    if delivery_mode == "disabled":
        logger.warning("Payment success email skipped for %s because delivery is disabled", recipient)
        return

    if delivery_mode == "log":
        logger.warning(
            "Payment success email for %s: plan=%s period=%s amount=%s order=%s",
            recipient,
            plan_tier,
            billing_period,
            amount_vnd,
            order_ref,
        )
        return

    if delivery_mode != "smtp":
        raise RuntimeError(f"Unsupported EMAIL_DELIVERY_MODE: {settings.email_delivery_mode}")

    if not settings.smtp_host:
        raise RuntimeError("SMTP_HOST is not configured")

    await asyncio.to_thread(_send_email_sync, recipient, subject, body_text, body_html)


async def send_transaction_notification_to_admin(
    *,
    user_email: str,
    user_name: str | None,
    plan_tier: str,
    billing_period: str,
    amount_vnd: int,
    order_ref: str,
    paid_at: datetime,
) -> None:
    from datetime import timezone, timedelta
    recipient = "inveraexe101@gmail.com"
    subject = f"[Invera Admin] Thông báo giao dịch thành công từ {user_email}"

    # Format plan/sessions
    if plan_tier == "additional_sessions":
        try:
            quantity = int(billing_period)
        except (ValueError, TypeError):
            quantity = 1
        plan_label = f"Mua thêm {quantity} phiên phỏng vấn"
    else:
        plan_label = {
            "basic": "Gói Basic",
            "pro": "Gói Pro",
            "premium": "Gói Premium",
        }.get(plan_tier, f"Gói {plan_tier.title()}")
        period_label = "tháng" if billing_period == "month" else "năm"
        plan_label = f"{plan_label} ({period_label})"

    amount_label = f"{amount_vnd:,.0f}".replace(",", ".")
    # Vietnam timezone is UTC+7
    vietnam_tz = timezone(timedelta(hours=7))
    local_time = paid_at.astimezone(vietnam_tz)
    time_str = local_time.strftime("%d/%m/%Y %H:%M:%S")

    body_text = (
        "Kính gửi Admin,\n\n"
        "Hệ thống Invera ghi nhận một giao dịch nạp tiền thành công:\n"
        f"- Họ và tên: {user_name or 'N/A'}\n"
        f"- Gmail đăng ký: {user_email}\n"
        f"- Gói mua: {plan_label}\n"
        f"- Số tiền: {amount_label} VND\n"
        f"- Thời gian: {time_str} (GMT+7)\n"
        f"- Mã đơn hàng: {order_ref}\n\n"
        "Trân trọng,\n"
        "Invera AI System"
    )

    body_html = (
        "<!DOCTYPE html>"
        "<html lang='vi'>"
        "<head>"
        "<meta http-equiv='Content-Type' content='text/html; charset=utf-8'>"
        "<meta name='viewport' content='width=device-width, initial-scale=1.0'>"
        "<meta name='color-scheme' content='dark'>"
        "<meta name='supported-color-schemes' content='dark'>"
        "</head>"
        "<body style='margin:0;padding:0;background:#090d16;font-family:Arial,sans-serif;color:#cbd5e1;'>"
        "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' bgcolor='#090d16' style='background:#090d16;padding:24px 12px;'>"
        "<tr><td align='center'>"
        "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' bgcolor='#111827' style='max-width:640px;background:#111827;border-radius:24px;overflow:hidden;border:1px solid #1e293b;'>"
        "<tr><td bgcolor='#111827' style='padding:28px 32px 24px;background-color:#111827;background:#111827;border-bottom:1px solid #1e293b;'>"
        "<div style='font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#14b8a6;font-weight:700;margin-bottom:14px;'>Invera Admin</div>"
        "<div style='font-size:32px;line-height:1.15;font-weight:800;margin:0 0 12px;color:#ffffff;'>Giao dịch mới thành công</div>"
        f"<div style='font-size:16px;line-height:1.7;color:#94a3b8;margin:0;'>Hệ thống đã tự động kích hoạt dịch vụ cho người dùng {user_email}.</div>"
        "</td></tr>"
        "<tr><td bgcolor='#111827' style='padding:32px;background-color:#111827;background:#111827;'>"
        "<div style='text-align:center;margin:10px 0 28px;'>"
        "<div role='presentation' aria-label='Transaction amount' style='display:inline-block;padding:20px 32px;border-radius:20px;background-color:#1e293b;background:#1e293b;border:2px solid #14b8a6;text-align:center;'>"
        "<div style='font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:6px;font-weight:600;'>Số tiền giao dịch</div>"
        f"<div style='font-size:32px;line-height:1;font-weight:800;color:#14b8a6;'>+{amount_label} VND</div>"
        "</div>"
        "</div>"
        "<div style='font-size:15px;line-height:1.7;color:#cbd5e1;margin-bottom:16px;font-weight:600;'>"
        "Thông tin chi tiết giao dịch:"
        "</div>"
        "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='margin:12px 0 24px;border-collapse:separate;border-spacing:0;background-color:#1e293b;background:#1e293b;border-radius:18px;border:1px solid #334155;overflow:hidden;'>"
        "<tr>"
        "<td style='padding:14px 20px;border-bottom:1px solid #334155;font-size:14px;color:#94a3b8;'>Họ và tên</td>"
        f"<td style='padding:14px 20px;border-bottom:1px solid #334155;font-size:14px;color:#ffffff;font-weight:700;text-align:right;'>{user_name or 'N/A'}</td>"
        "</tr>"
        "<tr>"
        "<td style='padding:14px 20px;border-bottom:1px solid #334155;font-size:14px;color:#94a3b8;'>Gmail đăng ký</td>"
        f"<td style='padding:14px 20px;border-bottom:1px solid #334155;font-size:14px;color:#ffffff;text-align:right;'>{user_email}</td>"
        "</tr>"
        "<tr>"
        "<td style='padding:14px 20px;border-bottom:1px solid #334155;font-size:14px;color:#94a3b8;'>Gói mua</td>"
        f"<td style='padding:14px 20px;border-bottom:1px solid #334155;font-size:14px;color:#ffffff;font-weight:700;text-align:right;'>{plan_label}</td>"
        "</tr>"
        "<tr>"
        "<td style='padding:14px 20px;border-bottom:1px solid #334155;font-size:14px;color:#94a3b8;'>Thời gian</td>"
        f"<td style='padding:14px 20px;border-bottom:1px solid #334155;font-size:14px;color:#ffffff;text-align:right;'>{time_str} (GMT+7)</td>"
        "</tr>"
        "<tr>"
        "<td style='padding:14px 20px;font-size:14px;color:#94a3b8;'>Mã đơn hàng</td>"
        f"<td style='padding:14px 20px;font-size:14px;color:#ffffff;font-family:monospace;text-align:right;'>{order_ref}</td>"
        "</tr>"
        "</table>"
        "<div style='font-size:14px;line-height:1.7;color:#94a3b8;margin-bottom:12px;'>"
        "Giao dịch đã được hệ thống tự động xử lý và cộng quyền lợi gói tương ứng cho tài khoản người dùng."
        "</div>"
        "<div style='margin-top:28px;padding-top:20px;border-top:1px solid #1e293b;font-size:13px;line-height:1.7;color:#64748b;'>Invera • AI Interview Practice Platform</div>"
        "</td></tr></table>"
        "</td></tr></table>"
        "</body>"
        "</html>"
    )

    delivery_mode = settings.email_delivery_mode.lower()
    if delivery_mode == "disabled":
        logger.warning("Admin transaction notification skipped because delivery is disabled")
        return

    if delivery_mode == "log":
        logger.warning(
            "Admin transaction notification: email=%s name=%s plan=%s amount=%s time=%s",
            user_email, user_name, plan_tier, amount_vnd, time_str
        )
        return

    if delivery_mode != "smtp":
        raise RuntimeError(f"Unsupported EMAIL_DELIVERY_MODE: {settings.email_delivery_mode}")

    if not settings.smtp_host:
        raise RuntimeError("SMTP_HOST is not configured")

    await asyncio.to_thread(_send_email_sync, recipient, subject, body_text, body_html)

