"""Email and SMS to the buyer.

SMS goes through `send_sms`, which only logs until a Georgian SMS provider
is chosen; swap the body of `send_sms` for the provider's API call then.
"""

import logging

from django.conf import settings
from django.core.mail import send_mail

log = logging.getLogger(__name__)


def send_sms(phone, text):
    log.info("SMS to %s: %s", phone[-4:].rjust(len(phone), "*"), text)


def application_created(app):
    company = app.leasing_company.name
    send_sms(
        app.phone,
        f"თქვენი განაცხადის კოდია {app.code}. მიდით {company}-ში და დაასახელეთ ეს კოდი.",
    )
    if app.email:
        address = " · ".join(v for v in (app.leasing_company.address, app.leasing_company.phone) if v)
        send_mail(
            subject=f"თქვენი განაცხადი {app.code}",
            message=(
                f"გამარჯობა, {app.first_name}!\n\n"
                f"თქვენი განაცხადი {app.car}-ზე გაგზავნილია {company}-ში. "
                f"მისვლისას დაასახელეთ კოდი: {app.code}\n\n"
                + (f"კომპანიის მისამართი: {address}\n" if address else "")
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[app.email],
            fail_silently=True,
        )


def application_opened(app):
    send_sms(
        app.phone,
        f"{app.leasing_company.name}-მ გახსნა თქვენი განაცხადი {app.code}. "
        f"თუ ეს თქვენ არ ხართ, დაგვირეკეთ: {settings.SUPPORT_PHONE}.",
    )
