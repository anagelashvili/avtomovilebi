"""Morning email to every dealer user (plan §3, screen 7). Run each weekday
morning from the host's cron:

    python manage.py send_dealer_reminders
"""

from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand
from django.db.models import Count, Q

from core.models import Car, Organization


class Command(BaseCommand):
    help = "Email dealers a reminder to update today's cars."

    def handle(self, *args, **options):
        site = settings.SITE_URL.rstrip("/")
        dealers = Organization.objects.filter(is_dealer=True).annotate(
            active=Count("cars", filter=Q(cars__status=Car.Status.ACTIVE)),
            drafts=Count("cars", filter=Q(cars__status=Car.Status.DRAFT)),
        )
        sent = 0
        for org in dealers:
            for user in org.users.filter(is_active=True).exclude(email=""):
                drafts = (
                    f"\n{org.drafts} მანქანა ჯერ დრაფტადაა — ფოტოს დამატების შემდეგ გამოჩნდება საიტზე: {site}/dealer/photos\n"
                    if org.drafts else ""
                )
                send_mail(
                    subject="დილა მშვიდობისა! განაახლეთ დღევანდელი მანქანები",
                    message=(
                        f"გამარჯობა, {user.first_name or user.username}.\n\n"
                        f"თქვენს კატალოგში ამჟამად {org.active} აქტიური მანქანაა. აირჩიეთ, როგორ განაახლებთ დღეს:\n\n"
                        f"Excel-ის ატვირთვა: {site}/dealer/import\n"
                        f"მანქანის დამატება ხელით: {site}/dealer/cars/new\n"
                        f"შაბლონი: {site}/api/dealer/import/template/\n"
                        f"{drafts}"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                sent += 1
        self.stdout.write(self.style.SUCCESS(f"Sent {sent} reminder(s)."))
