"""Demo data for local development: one dealer, three leasing companies,
the cars from the mockup, and a login for each organisation.

    python manage.py seed_demo --photos path/to/folder

The folder should hold p1.jpg, p3.jpg, p4.jpg, p8.jpg (the mockup photos).
Running it again resets the demo organisations.
"""

import secrets
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError

from core.models import Car, CarPhoto, LeaseOffer, Organization, User

CARS = [
    ("A-101", "Chevrolet", "Corvette Z06", 2023, "coupe", "petrol", "6.2", 12400, 98000, "თბილისი", "p1.jpg", 3577),
    ("A-102", "BMW", "iX3", 2025, "suv", "electric", "", 8900, 85000, "თბილისი", "p8.jpg", 3102),
    ("A-103", "Chevrolet", "Corvette Z06", 2023, "coupe", "petrol", "6.2", 15700, 96000, "ბათუმი", "p4.jpg", 3504),
    ("A-104", "BMW", "iX3", 2025, "suv", "electric", "", 5200, 88000, "თბილისი", "p3.jpg", 3212),
]
LEASING = [("demo-leasing-a", "[კომპანია A]"), ("demo-leasing-b", "[კომპანია B]"), ("demo-leasing-c", "[კომპანია C]")]


class Command(BaseCommand):
    help = "Create demo organisations, users and cars (local development only)."

    def add_arguments(self, parser):
        parser.add_argument("--photos", required=True, help="Folder with p1/p3/p4/p8.jpg")

    def handle(self, *args, photos, **options):
        if not settings.DEBUG:
            raise CommandError("seed_demo runs only with DJANGO_DEBUG=true.")
        folder = Path(photos)
        missing = [c[10] for c in CARS if not (folder / c[10]).exists()]
        if missing:
            raise CommandError(f"Missing photos in {folder}: {', '.join(missing)}")

        codes = ["demo-dealer"] + [c for c, _ in LEASING]
        User.objects.filter(organization__code__in=codes).delete()
        Organization.objects.filter(code__in=codes).delete()

        dealer = Organization.objects.create(name="[დილერი]", code="demo-dealer", is_dealer=True)
        companies = [
            Organization.objects.create(
                name=name, code=code, is_leasing=True, phone="[ტელეფონი]", address="[მისამართი]"
            )
            for code, name in LEASING
        ]

        for ext, make, model, year, body, fuel, engine, km, price, city, photo, monthly in CARS:
            car = Car.objects.create(
                organization=dealer, external_id=ext, make=make, model=model, year=year,
                body=body, fuel=fuel, engine=engine, transmission="automatic",
                mileage_km=km, price_gel=price, city=city, status=Car.Status.ACTIVE,
            )
            with open(folder / photo, "rb") as f:
                CarPhoto.objects.create(car=car, image=File(f, name=photo), position=0)
            for i, company in enumerate(companies[:2]):
                LeaseOffer.objects.create(
                    car=car, leasing_company=company, term_months=36 + 12 * i,
                    down_payment_gel=price // 5, monthly_gel=monthly + 150 * i,
                )

        lines = []
        for username, org in [("dealer", dealer), ("leasing-a", companies[0])]:
            password = secrets.token_urlsafe(9)
            User.objects.create_user(username, password=password, organization=org, role="owner")
            lines.append(f"  {username:<10} {password}   ({org.name})")

        self.stdout.write(self.style.SUCCESS(f"Created {len(CARS)} cars. Logins:"))
        self.stdout.write("\n".join(lines))
