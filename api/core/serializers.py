from rest_framework import serializers

from .models import Car, CarPhoto, Organization, User

MAX_PHOTO_BYTES = 10 * 1024 * 1024
PHOTO_FORMATS = {"JPEG", "PNG", "WEBP"}


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "name", "code", "is_dealer", "is_leasing"]


class MeSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "role", "is_staff", "organization"]


class CarPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarPhoto
        fields = ["id", "image", "position"]
        read_only_fields = ["position"]

    def validate_image(self, image):
        if image.size > MAX_PHOTO_BYTES:
            raise serializers.ValidationError("ფოტო 10 MB-ზე დიდი არ უნდა იყოს.")
        fmt = getattr(getattr(image, "image", None), "format", None)
        if fmt not in PHOTO_FORMATS:
            raise serializers.ValidationError("დასაშვებია JPG, PNG ან WEBP.")
        return image


class CarSerializer(serializers.ModelSerializer):
    photos = CarPhotoSerializer(many=True, read_only=True)
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Car
        fields = [
            "id", "external_id", "make", "model", "year", "body", "fuel", "engine",
            "transmission", "mileage_km", "price_gel", "city", "description",
            "status", "photos", "updated_at",
        ]

    def validate_external_id(self, value):
        org = self.context["request"].user.organization
        qs = Car.objects.filter(organization=org, external_id=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("ამ ID-ით მანქანა უკვე გაქვთ.")
        return value
