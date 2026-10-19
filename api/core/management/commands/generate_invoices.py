"""Run on the 1st of each month (Railway/Render cron):

    python manage.py generate_invoices            # previous month
    python manage.py generate_invoices --month 2026-09
"""

from datetime import date

from django.core.management.base import BaseCommand, CommandError

from core.invoicing import generate_invoices, previous_month


class Command(BaseCommand):
    help = "Create monthly commission invoices for signed deals."

    def add_arguments(self, parser):
        parser.add_argument("--month", help="YYYY-MM; defaults to the previous month")

    def handle(self, *args, month=None, **options):
        if month:
            try:
                y, m = (int(p) for p in month.split("-"))
                target = date(y, m, 1)
            except ValueError as exc:
                raise CommandError("--month must look like 2026-09") from exc
        else:
            target = previous_month()
        invoices = generate_invoices(target)
        for inv in invoices:
            self.stdout.write(f"{inv}: {inv.items.count()} deals, {inv.amount_gel} ლ")
        self.stdout.write(self.style.SUCCESS(f"{target:%Y-%m}: {len(invoices)} invoice(s) updated."))
