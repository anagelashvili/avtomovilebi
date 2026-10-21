"""A buyer's own page: see your applications and their status.

No account: the buyer types the phone they applied with, gets a 6-digit
code by SMS, and that phone is remembered in the session for a while.
Personal details (ID number, phone) are never sent back — only what the
buyer needs to follow their application.
"""

import secrets
import time

from django.conf import settings
from django.core.cache import cache
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from . import notify
from .fields import normalize_phone, phone_lookup_hash
from .models import Application

CODE_TTL = 10 * 60  # seconds a code is valid
MAX_TRIES = 5  # wrong codes before a new one is needed
SESSION_TTL = 60 * 60  # how long the page stays unlocked
SESSION_KEY = "buyer_phone_hash"


class CodeThrottle(AnonRateThrottle):
    scope = "public_form"


def _cache_key(phone_hash):
    return f"buyer-code:{phone_hash}"


class RequestCode(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [CodeThrottle]

    def post(self, request):
        phone = normalize_phone(str(request.data.get("phone", "")))
        if not phone:
            return Response({"phone": ["მიუთითეთ მობილურის ნომერი, მაგ. 555 12 34 56."]}, status=status.HTTP_400_BAD_REQUEST)
        h = phone_lookup_hash(phone)
        data = {"detail": "თუ ამ ნომრით განაცხადი გაქვთ, კოდი SMS-ით გამოგიგზავნეთ."}
        # Same answer either way, so the page can't be used to check whose number applied.
        if Application.objects.filter(phone_hash=h).exists():
            code = f"{secrets.randbelow(1_000_000):06d}"
            cache.set(_cache_key(h), {"code": code, "tries": 0}, CODE_TTL)
            notify.send_sms(phone, f"avtomobilebi.ge: თქვენი კოდია {code}. მოქმედებს 10 წუთი.")
            if settings.DEBUG:
                data["debug_code"] = code  # local testing only, never in production
        return Response(data)


class VerifyCode(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [CodeThrottle]

    def post(self, request):
        phone = normalize_phone(str(request.data.get("phone", "")))
        h = phone_lookup_hash(phone) if phone else ""
        entry = cache.get(_cache_key(h)) if h else None
        wrong = Response({"detail": "კოდი არასწორია ან ვადა გაუვიდა."}, status=status.HTTP_400_BAD_REQUEST)
        if not entry:
            return wrong
        if not secrets.compare_digest(entry["code"], str(request.data.get("code", "")).strip()):
            entry["tries"] += 1
            if entry["tries"] >= MAX_TRIES:
                cache.delete(_cache_key(h))
            else:
                cache.set(_cache_key(h), entry, CODE_TTL)
            return wrong
        cache.delete(_cache_key(h))
        request.session[SESSION_KEY] = {"hash": h, "until": time.time() + SESSION_TTL}
        return Response({"ok": True})


def session_phone_hash(request):
    data = request.session.get(SESSION_KEY)
    if not data or data.get("until", 0) < time.time():
        return None
    return data["hash"]


class MyApplications(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        h = session_phone_hash(request)
        if not h:
            return Response({"detail": "საჭიროა ტელეფონის დადასტურება."}, status=status.HTTP_403_FORBIDDEN)
        apps = (
            Application.objects.filter(phone_hash=h)
            .select_related("car", "offer", "leasing_company")
            .order_by("-created_at")
        )
        return Response([
            {
                "code": a.code,
                "car": str(a.car),
                "car_id": a.car_id,
                "company": a.leasing_company.name,
                "company_address": a.leasing_company.address,
                "company_phone": a.leasing_company.phone,
                "monthly_gel": a.offer.monthly_gel,
                "term_months": a.offer.term_months,
                "status": a.status,
                "status_label": a.get_status_display(),
                "created_at": a.created_at,
                "opened_at": a.opened_at,
                "signed_at": a.signed_at,
            }
            for a in apps
        ])

    def delete(self, request):
        request.session.pop(SESSION_KEY, None)
        return Response(status=status.HTTP_204_NO_CONTENT)
