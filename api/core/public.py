"""Public (no login) endpoints for the buyer side of the site."""

import re
import secrets

from django.conf import settings
from django.db import transaction
from django.db.models import Min, Prefetch
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from . import notify
from .models import Application, Car, CarPhoto, LeaseOffer, Organization

PUBLIC = {"authentication_classes": [], "permission_classes": [AllowAny]}


def _photo_url(request, photo):
    return request.build_absolute_uri(photo.image.url) if photo else None


class OfferSerializer(serializers.ModelSerializer):
    company = serializers.CharField(source="leasing_company.name")

    class Meta:
        model = LeaseOffer
        fields = ["id", "company", "term_months", "down_payment_gel", "monthly_gel"]


class CarCardSerializer(serializers.ModelSerializer):
    photo = serializers.SerializerMethodField()
    monthly_from = serializers.IntegerField()
    companies = serializers.SerializerMethodField()
    fuel_label = serializers.CharField(source="get_fuel_display")
    transmission_label = serializers.CharField(source="get_transmission_display")

    class Meta:
        model = Car
        fields = [
            "id", "make", "model", "year", "body", "fuel", "fuel_label", "engine",
            "transmission_label", "mileage_km", "price_gel", "city", "updated_at",
            "photo", "monthly_from", "companies",
        ]

    def get_photo(self, car):
        photos = car.photos.all()
        return _photo_url(self.context["request"], photos[0] if photos else None)

    def get_companies(self, car):
        return sorted({o.leasing_company.name for o in car.offers.all()})


class CarDetailSerializer(CarCardSerializer):
    photos = serializers.SerializerMethodField()
    offers = OfferSerializer(many=True)
    body_label = serializers.CharField(source="get_body_display")

    class Meta(CarCardSerializer.Meta):
        fields = CarCardSerializer.Meta.fields + ["body_label", "description", "photos", "offers"]

    def get_photos(self, car):
        return [_photo_url(self.context["request"], p) for p in car.photos.all()]


def public_cars():
    """Active cars that have at least one leasing offer."""
    return (
        Car.objects.filter(status=Car.Status.ACTIVE, offers__isnull=False)
        .annotate(monthly_from=Min("offers__monthly_gel"))
        .prefetch_related(
            Prefetch("photos", queryset=CarPhoto.objects.order_by("position", "id")),
            Prefetch("offers", queryset=LeaseOffer.objects.select_related("leasing_company")),
        )
        .distinct()
    )


def _int(value):
    return int(value) if value and str(value).isdigit() else None


class CarPagination(PageNumberPagination):
    page_size = 12


SORTS = {
    "new": "-updated_at",
    "price": "price_gel",
    "price_desc": "-price_gel",
    "monthly": "monthly_from",
}


class PublicCarList(APIView):
    """Filters: make, body, fuel (repeatable), price_min/max, year_min/max,
    monthly_max, company (organisation code), sort, page."""

    authentication_classes = PUBLIC["authentication_classes"]
    permission_classes = PUBLIC["permission_classes"]

    def get(self, request):
        q = request.query_params
        cars = public_cars()
        if q.get("make"):
            cars = cars.filter(make__iexact=q["make"])
        if q.get("body"):
            cars = cars.filter(body=q["body"])
        if q.getlist("fuel"):
            cars = cars.filter(fuel__in=q.getlist("fuel"))
        for param, lookup in (
            ("price_min", "price_gel__gte"), ("price_max", "price_gel__lte"),
            ("year_min", "year__gte"), ("year_max", "year__lte"),
            ("monthly_max", "monthly_from__lte"),
        ):
            if _int(q.get(param)) is not None:
                cars = cars.filter(**{lookup: _int(q.get(param))})
        if q.get("company"):
            cars = cars.filter(offers__leasing_company__code=q["company"])
        cars = cars.order_by(SORTS.get(q.get("sort"), "-updated_at"), "id")

        paginator = CarPagination()
        page = paginator.paginate_queryset(cars, request, view=self)
        data = CarCardSerializer(page, many=True, context={"request": request}).data
        return paginator.get_paginated_response(data)


class PublicCarDetail(APIView):
    authentication_classes = PUBLIC["authentication_classes"]
    permission_classes = PUBLIC["permission_classes"]

    def get(self, request, pk):
        car = get_object_or_404(public_cars(), pk=pk)
        return Response(CarDetailSerializer(car, context={"request": request}).data)


class PublicFilters(APIView):
    """Values for the catalog filter dropdowns."""

    authentication_classes = PUBLIC["authentication_classes"]
    permission_classes = PUBLIC["permission_classes"]

    def get(self, request):
        cars = Car.objects.filter(status=Car.Status.ACTIVE, offers__isnull=False)
        return Response({
            "makes": sorted(set(cars.values_list("make", flat=True))),
            "bodies": [{"value": v, "label": l} for v, l in Car.Body.choices],
            "fuels": [{"value": v, "label": l} for v, l in Car.Fuel.choices],
            "companies": [
                {"value": o.code, "label": o.name}
                for o in Organization.objects.filter(is_leasing=True).order_by("name")
            ],
        })


class ApplicationCreateSerializer(serializers.Serializer):
    car = serializers.IntegerField()
    offer = serializers.IntegerField()
    first_name = serializers.CharField(max_length=80)
    last_name = serializers.CharField(max_length=80)
    personal_id = serializers.CharField()
    phone = serializers.CharField()
    email = serializers.EmailField(required=False, allow_blank=True)
    consent = serializers.BooleanField()

    def validate_personal_id(self, value):
        value = value.strip()
        if not re.fullmatch(r"\d{11}", value):
            raise serializers.ValidationError("პირადი ნომერი 11 ციფრისგან უნდა შედგებოდეს.")
        return value

    def validate_phone(self, value):
        digits = re.sub(r"[\s\-()]", "", value)
        digits = re.sub(r"^(\+?995)", "", digits)
        if not re.fullmatch(r"5\d{8}", digits):
            raise serializers.ValidationError("მიუთითეთ მობილურის ნომერი, მაგ. 555 12 34 56.")
        return digits

    def validate_consent(self, value):
        if not value:
            raise serializers.ValidationError("განაცხადის გასაგზავნად საჭიროა თანხმობა.")
        return value

    def validate(self, data):
        car = public_cars().filter(pk=data["car"]).first()
        if car is None:
            raise serializers.ValidationError({"car": "მანქანა ვერ მოიძებნა."})
        offer = LeaseOffer.objects.select_related("leasing_company").filter(
            pk=data["offer"], car=car
        ).first()
        if offer is None:
            raise serializers.ValidationError({"offer": "შეთავაზება ვერ მოიძებნა."})
        data["car"], data["offer"] = car, offer
        return data


class ApplyThrottle(SimpleRateThrottle):
    """Limits applications per visitor IP.

    The site's server action forwards the visitor's IP in X-Client-IP, signed
    with the shared INTERNAL_API_TOKEN; anyone else is limited by their own IP.
    """

    scope = "apply"

    def get_cache_key(self, request, view):
        token = settings.INTERNAL_API_TOKEN
        ip = None
        if token and secrets.compare_digest(request.headers.get("X-Internal-Token", ""), token):
            ip = request.headers.get("X-Client-IP")
        return self.cache_format % {"scope": self.scope, "ident": ip or self.get_ident(request)}


class PublicApplicationCreate(APIView):
    authentication_classes = PUBLIC["authentication_classes"]
    permission_classes = PUBLIC["permission_classes"]
    throttle_classes = [ApplyThrottle]

    def post(self, request):
        # Honeypot: a hidden field people never fill in, bots often do.
        if request.data.get("website"):
            return Response({"detail": "განაცხადი ვერ გაიგზავნა."}, status=status.HTTP_400_BAD_REQUEST)
        s = ApplicationCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        with transaction.atomic():
            app = Application.objects.create(
                car=d["car"], offer=d["offer"],
                first_name=d["first_name"].strip(), last_name=d["last_name"].strip(),
                personal_id=d["personal_id"], phone=d["phone"],
                email=d.get("email", ""), consent_at=timezone.now(),
            )
            transaction.on_commit(lambda: notify.application_created(app))
        return Response(
            {
                "code": app.code,
                "car": str(app.car),
                "company": app.leasing_company.name,
                "company_address": app.leasing_company.address,
                "monthly_gel": app.offer.monthly_gel,
                "term_months": app.offer.term_months,
                "email_sent": bool(app.email),
            },
            status=status.HTTP_201_CREATED,
        )
