"""Leasing company panel and our team's overview.

Plan §3/§6: in the company's list an application shows only the client's
name; everything else (including the code) stays hidden until the company
enters the code the client says in person. The hiding happens here, on the
server, not in the browser.
"""

import re
from datetime import date
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from . import notify
from .invoicing import generate_invoices, month_bounds, previous_month
from .models import Application, Invoice, Organization
from .permissions import IsLeasing

STALE_DAYS = 30


class OpenCodeThrottle(UserRateThrottle):
    """Limits code guessing per user."""

    scope = "open_code"


def _mask_phone(phone):
    return f"••• •• {phone[-2:]}" if phone else ""


class ApplicationRowSerializer(serializers.ModelSerializer):
    code = serializers.SerializerMethodField()
    car = serializers.CharField(source="car.__str__")
    status_label = serializers.CharField(source="get_status_display")
    opened = serializers.BooleanField(source="is_opened")
    phone = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = ["id", "code", "first_name", "last_name", "phone", "car", "created_at", "status", "status_label", "opened"]

    def get_code(self, app):
        return app.code if app.is_opened else "GL-•••••"

    def get_phone(self, app):
        return app.phone if app.is_opened else _mask_phone(app.phone)


class ApplicationDetailSerializer(serializers.ModelSerializer):
    car = serializers.CharField(source="car.__str__")
    car_price_gel = serializers.IntegerField(source="car.price_gel")
    car_external_id = serializers.CharField(source="car.external_id")
    dealer = serializers.CharField(source="car.organization.name")
    term_months = serializers.IntegerField(source="offer.term_months")
    down_payment_gel = serializers.IntegerField(source="offer.down_payment_gel")
    monthly_gel = serializers.IntegerField(source="offer.monthly_gel")
    status_label = serializers.CharField(source="get_status_display")
    next_statuses = serializers.SerializerMethodField()
    history = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            "code", "status", "status_label", "next_statuses", "first_name", "last_name",
            "personal_id", "phone", "email", "car", "car_price_gel", "car_external_id", "dealer",
            "term_months", "down_payment_gel", "monthly_gel", "contract_number",
            "created_at", "opened_at", "signed_at", "history",
        ]

    def get_next_statuses(self, app):
        return [{"value": s, "label": Application.Status(s).label} for s in sorted(app.TRANSITIONS[app.status])]

    def get_history(self, app):
        return [
            {
                "from": Application.Status(h.from_status).label,
                "to": Application.Status(h.to_status).label,
                "user": (h.user.get_full_name() or h.user.username) if h.user else "",
                "note": h.note,
                "at": h.created_at,
            }
            for h in app.history.select_related("user")
        ]


def normalize_code(raw):
    digits = re.sub(r"\D", "", raw or "")
    return f"GL-{digits}" if len(digits) == 5 else None


def company_apps(request):
    return Application.objects.filter(leasing_company=request.user.organization).select_related(
        "car", "car__organization", "offer"
    )


class LeasingApplications(APIView):
    permission_classes = [IsLeasing]

    def get(self, request):
        apps = company_apps(request)
        if request.query_params.get("status") in Application.Status.values:
            apps = apps.filter(status=request.query_params["status"])
        return Response(ApplicationRowSerializer(apps[:500], many=True).data)


class LeasingOpenCode(APIView):
    """The client says the code in person; the manager types it here."""

    permission_classes = [IsLeasing]
    throttle_classes = [OpenCodeThrottle]

    def post(self, request):
        code = normalize_code(request.data.get("code"))
        app = company_apps(request).filter(code=code).first() if code else None
        if app is None:
            return Response({"detail": "ასეთი კოდით განაცხადი ვერ მოიძებნა."}, status=status.HTTP_404_NOT_FOUND)
        if not app.is_opened:
            with transaction.atomic():
                app.change_status(Application.Status.ARRIVED, request.user, note="კოდი შეყვანილია")
                transaction.on_commit(lambda: notify.application_opened(app))
        return Response(ApplicationDetailSerializer(app).data)


def opened_app_or_404(request, code):
    return get_object_or_404(company_apps(request), code=code, opened_at__isnull=False)


class LeasingApplicationDetail(APIView):
    permission_classes = [IsLeasing]

    def get(self, request, code):
        return Response(ApplicationDetailSerializer(opened_app_or_404(request, code)).data)


class LeasingApplicationStatus(APIView):
    permission_classes = [IsLeasing]

    def post(self, request, code):
        app = opened_app_or_404(request, code)
        new_status = request.data.get("status")
        if new_status not in Application.Status.values:
            return Response({"detail": "უცნობი სტატუსი."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            app.change_status(
                new_status, request.user,
                contract_number=str(request.data.get("contract_number", "")),
                note=str(request.data.get("note", ""))[:300],
            )
        except ValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ApplicationDetailSerializer(app).data)


def invoice_data(invoice, with_items=False):
    data = {
        "id": invoice.id,
        "company": invoice.leasing_company.name,
        "month": f"{invoice.month:%Y-%m}",
        "amount_gel": str(invoice.amount_gel),
        "status": invoice.status,
        "status_label": invoice.get_status_display(),
        "deals": invoice.items.count(),
    }
    if with_items:
        data["bank_details"] = settings.INVOICE_BANK_DETAILS
        data["items"] = [
            {
                "code": i.application.code,
                "contract_number": i.application.contract_number,
                "car": str(i.application.car),
                "signed_at": i.application.signed_at,
                "amount_gel": str(i.amount_gel),
            }
            for i in invoice.items.select_related("application__car")
        ]
    return data


class LeasingInvoices(APIView):
    permission_classes = [IsLeasing]

    def get(self, request):
        invoices = Invoice.objects.filter(leasing_company=request.user.organization).select_related("leasing_company")
        return Response([invoice_data(i) for i in invoices])


class LeasingInvoiceDetail(APIView):
    permission_classes = [IsLeasing]

    def get(self, request, pk):
        invoice = get_object_or_404(Invoice, pk=pk, leasing_company=request.user.organization)
        return Response(invoice_data(invoice, with_items=True))


# --- Our team (is_staff)

def parse_month(raw):
    try:
        y, m = (int(p) for p in (raw or "").split("-"))
        return date(y, m, 1)
    except ValueError:
        return None


class StaffOverview(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        month = parse_month(request.query_params.get("month")) or timezone.localdate().replace(day=1)
        start, end = month_bounds(month)
        companies = (
            Organization.objects.filter(is_leasing=True)
            .annotate(
                created=Count("applications", filter=Q(applications__created_at__range=(start, end))),
                arrived=Count("applications", filter=Q(applications__opened_at__range=(start, end))),
                signed=Count("applications", filter=Q(applications__signed_at__range=(start, end))),
            )
            .order_by("name")
        )
        invoices = {i.leasing_company_id: i for i in Invoice.objects.filter(month=month)}
        rows = []
        for c in companies:
            signed = Application.objects.filter(leasing_company=c, signed_at__range=(start, end)).select_related("car")
            inv = invoices.get(c.id)
            rows.append({
                "id": c.id,
                "company": c.name,
                "applications": c.created,
                "arrived": c.arrived,
                "signed": c.signed,
                "commission_gel": str(sum((c.commission_for(a) for a in signed), Decimal(0))),
                "invoice": invoice_data(inv) if inv else None,
            })

        stale_before = timezone.now() - timezone.timedelta(days=STALE_DAYS)
        suspicious = [
            {"code": a.code, "company": a.leasing_company.name, "reason": "გაფორმებულია ხელშეკრულების ნომრის გარეშე"}
            for a in Application.objects.filter(status=Application.Status.SIGNED, contract_number="").select_related("leasing_company")
        ] + [
            {
                "code": a.code, "company": a.leasing_company.name,
                "reason": f"კოდი შეყვანილია, მაგრამ {STALE_DAYS} დღეზე მეტია სტატუსი არ შეცვლილა",
            }
            for a in Application.objects.filter(
                status=Application.Status.ARRIVED, status_changed_at__lt=stale_before
            ).select_related("leasing_company")
        ]
        return Response({
            "month": f"{month:%Y-%m}",
            "totals": {
                k: sum(r[k] for r in rows) for k in ("applications", "arrived", "signed")
            } | {"commission_gel": str(sum((Decimal(r["commission_gel"]) for r in rows), Decimal(0)))},
            "companies": rows,
            "suspicious": suspicious,
        })


class StaffGenerateInvoices(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        month = parse_month(request.data.get("month")) or previous_month()
        invoices = generate_invoices(month)
        return Response({"month": f"{month:%Y-%m}", "updated": len(invoices)})


class StaffInvoiceStatus(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        invoice = get_object_or_404(Invoice, pk=pk)
        new = request.data.get("status")
        if new not in Invoice.Status.values:
            return Response({"detail": "უცნობი სტატუსი."}, status=status.HTTP_400_BAD_REQUEST)
        invoice.status = new
        invoice.save(update_fields=["status"])
        return Response(invoice_data(invoice))
