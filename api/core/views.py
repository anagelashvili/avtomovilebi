from django.contrib.auth import authenticate, login, logout
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Max
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .excel_import import ImportFileError, import_cars, template_workbook
from .models import Car, CarPhoto
from .permissions import IsDealer
from .serializers import CarPhotoSerializer, CarSerializer, MeSerializer

MAX_PHOTOS_PER_CAR = 20


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"ok": True})


# --- Auth (session cookie, shared with the Next.js site via the parent domain)

@method_decorator(ensure_csrf_cookie, name="get")
class CsrfView(APIView):
    """GET sets the csrftoken cookie the site sends back as X-CSRFToken."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"ok": True})


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user = authenticate(
            request,
            username=request.data.get("username", ""),
            password=request.data.get("password", ""),
        )
        if user is None:
            return Response(
                {"detail": "მომხმარებელი ან პაროლი არასწორია."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        login(request, user)
        return Response(MeSerializer(user).data)


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    def get(self, request):
        return Response(MeSerializer(request.user).data)


# --- Dealer: cars and photos

class DealerCarViewSet(viewsets.ModelViewSet):
    serializer_class = CarSerializer
    permission_classes = [IsDealer]

    def get_queryset(self):
        return (
            Car.objects.filter(organization=self.request.user.organization)
            .prefetch_related("photos")
        )

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        car = self.get_object()
        try:
            car.publish()
        except ValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(car).data)

    @action(detail=True, methods=["post"])
    def unpublish(self, request, pk=None):
        car = self.get_object()
        car.status = Car.Status.DRAFT
        car.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(car).data)

    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser, FormParser])
    def photos(self, request, pk=None):
        car = self.get_object()
        files = request.FILES.getlist("image")
        if not files:
            return Response({"detail": "ფოტო არ არის არჩეული."}, status=status.HTTP_400_BAD_REQUEST)
        if car.photos.count() + len(files) > MAX_PHOTOS_PER_CAR:
            return Response(
                {"detail": f"ერთ მანქანას მაქსიმუმ {MAX_PHOTOS_PER_CAR} ფოტო შეიძლება ჰქონდეს."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializers = [CarPhotoSerializer(data={"image": f}) for f in files]
        errors = [s.errors for s in serializers if not s.is_valid()]
        if errors:
            return Response({"detail": errors}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            last = car.photos.aggregate(m=Max("position"))["m"]
            start = 0 if last is None else last + 1
            for i, s in enumerate(serializers):
                s.save(car=car, position=start + i)
        return Response(self.get_serializer(self.get_object()).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="photos/order")
    def photo_order(self, request, pk=None):
        """Body: {"ids": [photo ids in the new order]}; the first is the main photo."""
        car = self.get_object()
        ids = request.data.get("ids") or []
        photos = {p.id: p for p in car.photos.all()}
        if sorted(ids) != sorted(photos):
            return Response(
                {"detail": "ids უნდა შეიცავდეს ამ მანქანის ყველა ფოტოს."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            for position, pid in enumerate(ids):
                photos[pid].position = position
            CarPhoto.objects.bulk_update(photos.values(), ["position"])
        # Re-read: `car` still holds the photos prefetched in the old order.
        return Response(self.get_serializer(self.get_object()).data)

    @action(detail=True, methods=["delete"], url_path=r"photos/(?P<photo_id>\d+)")
    def delete_photo(self, request, pk=None, photo_id=None):
        car = self.get_object()
        photo = get_object_or_404(CarPhoto, pk=photo_id, car=car)
        photo.image.delete(save=False)
        photo.delete()
        # Query directly: car.photos is the prefetched list from before the delete.
        if car.status == Car.Status.ACTIVE and not CarPhoto.objects.filter(car=car).exists():
            car.status = Car.Status.DRAFT
            car.save(update_fields=["status", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


# --- Dealer: Excel import

class ExcelTemplateView(APIView):
    permission_classes = [IsDealer]

    def get(self, request):
        response = HttpResponse(
            template_workbook(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = 'attachment; filename="avtomobilebi-template.xlsx"'
        return response


class ExcelImportView(APIView):
    """POST a file as `file`. `commit=1` saves; otherwise only checks."""

    permission_classes = [IsDealer]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "ფაილი არ არის არჩეული."}, status=status.HTTP_400_BAD_REQUEST)
        commit = str(request.data.get("commit", "")).lower() in ("1", "true")
        try:
            result = import_cars(request.user.organization, file, commit=commit)
        except ImportFileError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {
                "committed": result.committed,
                "counts": result.counts,
                "rows": [r.__dict__ for r in result.rows],
            }
        )
