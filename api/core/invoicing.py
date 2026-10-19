"""Monthly commission invoices.

A deal counts in the month it was marked "signed" (plan §8 may still change
when a deal counts as done). Each signed application lands on at most one
invoice; running the generation again for the same month only adds deals
that are not invoiced yet.
"""

import calendar
from datetime import date, datetime, time
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from .models import Application, Invoice, InvoiceItem, Organization


def month_bounds(month):
    """month: a date in the month → (aware start, aware end) of that month."""
    first = month.replace(day=1)
    last_day = calendar.monthrange(first.year, first.month)[1]
    tz = timezone.get_current_timezone()
    start = timezone.make_aware(datetime.combine(first, time.min), tz)
    end = timezone.make_aware(datetime.combine(first.replace(day=last_day), time.max), tz)
    return start, end


def previous_month(today=None):
    today = today or timezone.localdate()
    year, month = (today.year, today.month - 1) if today.month > 1 else (today.year - 1, 12)
    return date(year, month, 1)


def uninvoiced_signed(company, month):
    start, end = month_bounds(month)
    return Application.objects.filter(
        leasing_company=company,
        status=Application.Status.SIGNED,
        signed_at__range=(start, end),
        invoice_item__isnull=True,
    ).select_related("car")


@transaction.atomic
def generate_invoices(month):
    """Creates or extends one invoice per leasing company for `month`.
    Returns the invoices that got new lines."""
    month = month.replace(day=1)
    touched = []
    for company in Organization.objects.filter(is_leasing=True):
        apps = list(uninvoiced_signed(company, month))
        if not apps:
            continue
        invoice, _ = Invoice.objects.get_or_create(
            leasing_company=company, month=month, defaults={"amount_gel": Decimal(0)}
        )
        if invoice.status == Invoice.Status.PAID:
            # Never change a paid invoice; late deals wait for a manual decision.
            continue
        for app in apps:
            InvoiceItem.objects.create(
                invoice=invoice, application=app, amount_gel=company.commission_for(app)
            )
        invoice.amount_gel = sum((i.amount_gel for i in invoice.items.all()), Decimal(0))
        invoice.save(update_fields=["amount_gel"])
        touched.append(invoice)
    return touched
