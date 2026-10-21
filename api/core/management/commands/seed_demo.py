"""Demo data for local development: the leasing companies we pitch to,
their cars, and a few logins.

    python manage.py seed_demo                      # photos from api/demo-photos/
    python manage.py seed_demo --photos path/to/dir

Cars come from core/demo/partner_cars.json (details as listed on each
company's myauto.ge page). Photos are free-licence pictures of the same
models from Wikimedia Commons, with credits in <photos>/credits.json; they
are not in git. Running it again resets the demo companies, their cars and
applications. Logins are written to .demo-logins.txt (git-ignored).
"""

import json
import secrets
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError

from core.models import (
    Application, Car, CarPhoto, Invoice, InvoiceItem, LeaseOffer, Organization, StatusChange, User,
)

DATA = Path(__file__).resolve().parents[2] / "demo" / "partner_cars.json"

# The leasing companies to pitch to (names from their myauto.ge dealer pages).
# Each both sells its own cars and offers leasing.
LEASING = [
    ("demo-tbc-leasing", "თიბისი ლიზინგი"),
    ("demo-credo", "კრედო ბანკი"),
    ("demo-liberty", "Liberty Bank"),
    ("demo-silk", "სილქ ბანკი"),
    ("demo-miso-leader", "შპს მისო ლიდერ კრედიტი"),
    ("demo-miso-euro", "მისო ევრო კრედიტი"),
    ("demo-mogo", "MOGO"),
    ("demo-dizi", "შპს დიზი"),
    ("demo-centrali", "ცენტრალი"),
    ("demo-skapi", "სკაპი"),
    ("demo-tera", "Tera Auto"),
]
# Removed on every run too, so older demo data doesn't linger.
OLD_CODES = ["demo-dealer", "demo-leasing-a", "demo-leasing-b", "demo-leasing-c"]

# EXAMPLE offer terms for the demo only, not any company's real terms:
# (down payment share, months, yearly interest).
OWN_OFFER = (0.20, 36, 0.18)
PARTNER_OFFER = (0.30, 48, 0.16)


def monthly_payment(price, down_share, months, yearly_rate):
    principal = price * (1 - down_share)
    r = yearly_rate / 12
    return round(principal * r / (1 - (1 + r) ** -months))


class Command(BaseCommand):
    help = "Create demo companies, their cars and logins (local development only)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--photos", default=str(Path(settings.BASE_DIR) / "demo-photos"),
            help="Folder with NN.jpg photos and credits.json",
        )

    def handle(self, *args, photos, **options):
        if not settings.DEBUG:
            raise CommandError("seed_demo runs only with DJANGO_DEBUG=true.")
        folder = Path(photos)
        cars = json.loads(DATA.read_text(encoding="utf-8"))["cars"]
        credits_file = folder / "credits.json"
        credits = json.loads(credits_file.read_text(encoding="utf-8")) if credits_file.exists() else {}
        missing = [f"{n:02d}.jpg" for n in range(len(cars)) if not (folder / f"{n:02d}.jpg").exists()]
        if missing:
            self.stdout.write(self.style.WARNING(f"No photo for: {', '.join(missing)} (those cars stay drafts)"))

        codes = OLD_CODES + [c for c, _ in LEASING]
        demo_apps = Application.objects.filter(leasing_company__code__in=codes)
        InvoiceItem.objects.filter(application__in=demo_apps).delete()
        Invoice.objects.filter(leasing_company__code__in=codes).delete()
        StatusChange.objects.filter(application__in=demo_apps).delete()
        demo_apps.delete()
        User.objects.filter(organization__code__in=codes).delete()
        Organization.objects.filter(code__in=codes).delete()

        companies = {
            code: Organization.objects.create(
                name=name, code=code, is_dealer=True, is_leasing=True,
                phone="[ტელეფონი]", address="[მისამართი]", commission_value=300,
            )
            for code, name in LEASING
        }
        order = [code for code, _ in LEASING]
        # Logos as each company shows them on its myauto.ge page (where it has one).
        for code, org in companies.items():
            logo = folder / "logos" / f"{code}.png"
            if logo.exists():
                with open(logo, "rb") as f:
                    org.logo.save(logo.name, File(f), save=True)

        for n, c in enumerate(cars):
            seller = companies[c["company"]]
            photo = folder / f"{n:02d}.jpg"
            car = Car.objects.create(
                organization=seller, external_id=f"M-{n + 1:03d}", make=c["make"], model=c["model"],
                year=c["year"], body=c["body"], fuel=c["fuel"], engine=c["engine"],
                transmission=c["transmission"], mileage_km=c["mileage_km"], price_gel=c["price_gel"],
                city=c["city"], status=Car.Status.ACTIVE if photo.exists() else Car.Status.DRAFT,
            )
            if photo.exists():
                cr = credits.get(photo.name, {})
                credit = f"{cr.get('artist') or 'Wikimedia Commons'} · {cr.get('license', '')}".strip(" ·")
                with open(photo, "rb") as f:
                    CarPhoto.objects.create(car=car, image=File(f, name=photo.name), position=0, credit=credit[:300])
            partner = companies[order[(order.index(c["company"]) + 1) % len(order)]]
            for company, (down, months, rate) in ((seller, OWN_OFFER), (partner, PARTNER_OFFER)):
                LeaseOffer.objects.create(
                    car=car, leasing_company=company, term_months=months,
                    down_payment_gel=round(c["price_gel"] * down),
                    monthly_gel=monthly_payment(c["price_gel"], down, months, rate),
                )

        first, second = companies[order[0]], companies[order[1]]
        lines = ["Demo logins (local development only):"]
        for username, org in [("dealer", first), ("leasing-a", second)]:
            password = secrets.token_urlsafe(9)
            User.objects.create_user(username, password=password, organization=org, role="owner")
            lines.append(f"  {username:<10} {password}   ({org.code})")
        team = User.objects.filter(username="team").first() or User(username="team", is_staff=True)
        password = secrets.token_urlsafe(9)
        team.is_staff = True
        team.set_password(password)
        team.save()
        lines.append(f"  team       {password}   (our team: /overview)")

        # Written as UTF-8 to a git-ignored file: the Windows console can't
        # always print it, and passwords shouldn't sit in terminal history.
        out = Path(settings.BASE_DIR).parent / ".demo-logins.txt"
        out.write_text("\n".join(lines) + "\n", encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"Created {len(cars)} cars for {len(companies)} companies. Logins: {out}"))
