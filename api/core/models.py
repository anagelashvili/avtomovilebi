import secrets

from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from .fields import EncryptedCharField


class Organization(models.Model):
    """A dealer, a leasing company, or both.

    Whether dealers and leasing companies are the same organisation is still
    an open question in the plan, so each organisation carries both flags and
    either answer works without a schema change.
    """

    name = models.CharField("სახელი", max_length=200)
    code = models.SlugField("კოდი", max_length=40, unique=True)
    is_dealer = models.BooleanField("დილერი", default=False)
    is_leasing = models.BooleanField("ლიზინგ კომპანია", default=False)
    phone = models.CharField("ტელეფონი", max_length=40, blank=True)
    email = models.EmailField("ელ-ფოსტა", blank=True)
    address = models.CharField("მისამართი", max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "ორგანიზაცია"
        verbose_name_plural = "ორგანიზაციები"
        ordering = ["name"]

    def __str__(self):
        return self.name


class User(AbstractUser):
    class Role(models.TextChoices):
        OWNER = "owner", "მფლობელი"
        MANAGER = "manager", "მენეჯერი"

    organization = models.ForeignKey(
        Organization,
        verbose_name="ორგანიზაცია",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="users",
        help_text="ცარიელი ჩვენი გუნდის წევრებისთვის.",
    )
    role = models.CharField("როლი", max_length=20, choices=Role.choices, default=Role.MANAGER)

    @property
    def is_dealer(self):
        return bool(self.organization and self.organization.is_dealer)

    @property
    def is_leasing(self):
        return bool(self.organization and self.organization.is_leasing)


class Car(models.Model):
    class Fuel(models.TextChoices):
        PETROL = "petrol", "ბენზინი"
        DIESEL = "diesel", "დიზელი"
        HYBRID = "hybrid", "ჰიბრიდი"
        ELECTRIC = "electric", "ელექტრო"
        GAS = "gas", "გაზი"

    class Transmission(models.TextChoices):
        AUTOMATIC = "automatic", "ავტომატური"
        MANUAL = "manual", "მექანიკური"

    class Body(models.TextChoices):
        SEDAN = "sedan", "სედანი"
        SUV = "suv", "ჯიპი / SUV"
        HATCHBACK = "hatchback", "ჰეჩბეკი"
        WAGON = "wagon", "უნივერსალი"
        COUPE = "coupe", "კუპე"
        MINIVAN = "minivan", "მინივენი"
        PICKUP = "pickup", "პიკაპი"

    class Status(models.TextChoices):
        DRAFT = "draft", "დრაფტი"
        ACTIVE = "active", "აქტიური"
        ARCHIVED = "archived", "დაარქივებული"

    organization = models.ForeignKey(
        Organization, verbose_name="დილერი", on_delete=models.CASCADE, related_name="cars"
    )
    external_id = models.CharField("ID / ნომერი", max_length=60)
    make = models.CharField("მარკა", max_length=60)
    model = models.CharField("მოდელი", max_length=80)
    year = models.PositiveSmallIntegerField("წელი")
    body = models.CharField("ძარის ტიპი", max_length=20, choices=Body.choices, blank=True)
    fuel = models.CharField("საწვავი", max_length=20, choices=Fuel.choices)
    engine = models.CharField("ძრავა", max_length=40, blank=True)
    transmission = models.CharField(
        "გადაცემათა კოლოფი", max_length=20, choices=Transmission.choices
    )
    mileage_km = models.PositiveIntegerField("გარბენი, კმ")
    price_gel = models.PositiveIntegerField("ფასი, ლ")
    city = models.CharField("ქალაქი", max_length=60)
    description = models.TextField("აღწერა", blank=True)
    status = models.CharField(
        "სტატუსი", max_length=20, choices=Status.choices, default=Status.DRAFT
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "მანქანა"
        verbose_name_plural = "მანქანები"
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "external_id"], name="unique_car_id_per_dealer"
            )
        ]

    def __str__(self):
        return f"{self.make} {self.model} {self.year}"

    def publish(self):
        """Cars without photos stay drafts (plan §8 may still change this)."""
        if not self.photos.exists():
            raise ValidationError("ფოტოს გარეშე მანქანა ვერ გამოქვეყნდება.")
        self.status = self.Status.ACTIVE
        self.save(update_fields=["status", "updated_at"])


def car_photo_path(instance, filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    return f"cars/{instance.car.organization_id}/{instance.car_id}/{secrets.token_hex(8)}.{ext}"


class CarPhoto(models.Model):
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name="photos")
    image = models.ImageField(upload_to=car_photo_path)
    position = models.PositiveSmallIntegerField(default=0, help_text="0 = მთავარი ფოტო")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "ფოტო"
        verbose_name_plural = "ფოტოები"
        ordering = ["position", "id"]


class LeaseOffer(models.Model):
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name="offers")
    leasing_company = models.ForeignKey(
        Organization,
        verbose_name="ლიზინგ კომპანია",
        on_delete=models.CASCADE,
        related_name="offers",
        limit_choices_to={"is_leasing": True},
    )
    term_months = models.PositiveSmallIntegerField("ვადა, თვე")
    down_payment_gel = models.PositiveIntegerField("შენატანი, ლ")
    monthly_gel = models.PositiveIntegerField("თვიური, ლ")

    class Meta:
        verbose_name = "ლიზინგის შეთავაზება"
        verbose_name_plural = "ლიზინგის შეთავაზებები"
        ordering = ["monthly_gel"]

    def __str__(self):
        return f"{self.leasing_company} · {self.monthly_gel} ლ/თვე"


class Application(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "ახალი"
        ARRIVED = "arrived", "მივიდა"
        SIGNED = "signed", "გაფორმდა"
        REJECTED = "rejected", "უარი"

    # Allowed next statuses; anything else is refused.
    TRANSITIONS = {
        Status.NEW: {Status.ARRIVED, Status.REJECTED},
        Status.ARRIVED: {Status.SIGNED, Status.REJECTED},
        Status.SIGNED: set(),
        Status.REJECTED: set(),
    }

    code = models.CharField("კოდი", max_length=12, unique=True, editable=False)
    car = models.ForeignKey(Car, on_delete=models.PROTECT, related_name="applications")
    offer = models.ForeignKey(LeaseOffer, on_delete=models.PROTECT, related_name="applications")
    leasing_company = models.ForeignKey(
        Organization, on_delete=models.PROTECT, related_name="applications", editable=False
    )
    first_name = models.CharField("სახელი", max_length=80)
    last_name = models.CharField("გვარი", max_length=80)
    personal_id = EncryptedCharField("პირადი ნომერი")
    phone = EncryptedCharField("ტელეფონი")
    email = models.EmailField("ელ-ფოსტა", blank=True)
    consent_at = models.DateTimeField("თანხმობის დრო")
    status = models.CharField(
        "სტატუსი", max_length=20, choices=Status.choices, default=Status.NEW, editable=False
    )
    contract_number = models.CharField("ხელშეკრულების ნომერი", max_length=60, blank=True)
    opened_at = models.DateTimeField("კოდი შეყვანილია", null=True, blank=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "განაცხადი"
        verbose_name_plural = "განაცხადები"
        ordering = ["-created_at"]

    def __str__(self):
        return self.code

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self._new_code()
        if self.offer_id and not self.leasing_company_id:
            self.leasing_company_id = self.offer.leasing_company_id
        super().save(*args, **kwargs)

    @classmethod
    def _new_code(cls):
        for _ in range(20):
            code = f"GL-{secrets.randbelow(90000) + 10000}"
            if not cls.objects.filter(code=code).exists():
                return code
        raise RuntimeError("Could not generate a free application code")

    @transaction.atomic
    def change_status(self, new_status, user, contract_number="", note=""):
        if new_status not in self.TRANSITIONS[self.status]:
            raise ValidationError(
                f"სტატუსი „{self.get_status_display()}“ ვერ შეიცვლება „{self.Status(new_status).label}“-ით."
            )
        if new_status == self.Status.SIGNED:
            contract_number = contract_number.strip()
            if not contract_number:
                raise ValidationError("„გაფორმდა“-სთვის ხელშეკრულების ნომერი სავალდებულოა.")
            self.contract_number = contract_number
        old = self.status
        self.status = new_status
        if new_status == self.Status.ARRIVED and not self.opened_at:
            self.opened_at = timezone.now()
        self.save()
        StatusChange.objects.create(
            application=self, user=user, from_status=old, to_status=new_status, note=note
        )


class StatusChange(models.Model):
    """Every status change is recorded: who, when, what (plan §6)."""

    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name="history")
    user = models.ForeignKey(User, on_delete=models.PROTECT, null=True)
    from_status = models.CharField(max_length=20)
    to_status = models.CharField(max_length=20)
    note = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "სტატუსის ცვლილება"
        verbose_name_plural = "სტატუსის ისტორია"
        ordering = ["created_at"]


class Invoice(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "მომზადებული"
        SENT = "sent", "გაგზავნილია"
        PAID = "paid", "გადახდილია"

    leasing_company = models.ForeignKey(
        Organization, on_delete=models.PROTECT, related_name="invoices"
    )
    month = models.DateField("თვე", help_text="თვის პირველი დღე")
    applications = models.ManyToManyField(Application, related_name="invoices")
    amount_gel = models.DecimalField("თანხა, ლ", max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "ინვოისი"
        verbose_name_plural = "ინვოისები"
        constraints = [
            models.UniqueConstraint(
                fields=["leasing_company", "month"], name="one_invoice_per_company_month"
            )
        ]
