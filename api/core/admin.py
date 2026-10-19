from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from django.core.exceptions import ValidationError
from django.contrib import messages

from .accounts import approve_partner_request
from .invoicing import generate_invoices, previous_month
from .models import (
    Application, Car, CarPhoto, Invoice, InvoiceItem, LeaseOffer, Organization, PartnerRequest,
    StatusChange, User,
)


@admin.register(PartnerRequest)
class PartnerRequestAdmin(admin.ModelAdmin):
    list_display = ["company_name", "kind", "tax_id", "contact_name", "phone", "email", "status", "created_at"]
    list_filter = ["status", "kind"]
    search_fields = ["company_name", "tax_id", "email"]
    readonly_fields = ["status", "organization", "created_at"]
    actions = ["approve", "reject"]

    @admin.action(description="დამტკიცება: ანგარიშის შექმნა და მოწვევის გაგზავნა")
    def approve(self, request, queryset):
        for req in queryset:
            try:
                org = approve_partner_request(req)
                self.message_user(request, f"{org}: ანგარიში შეიქმნა, მოწვევა გაიგზავნა {req.email}-ზე.")
            except ValidationError as exc:
                self.message_user(request, exc.messages[0], level=messages.ERROR)

    @admin.action(description="უარყოფა")
    def reject(self, request, queryset):
        n = queryset.filter(status=PartnerRequest.Status.NEW).update(status=PartnerRequest.Status.REJECTED)
        self.message_user(request, f"უარყოფილია {n} მოთხოვნა.")


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "is_dealer", "is_leasing", "commission_type", "commission_value", "phone"]
    list_filter = ["is_dealer", "is_leasing"]
    search_fields = ["name", "code"]
    prepopulated_fields = {"code": ["name"]}


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["username", "first_name", "last_name", "organization", "role", "is_staff"]
    list_filter = ["organization", "role", "is_staff"]
    fieldsets = BaseUserAdmin.fieldsets + (("ორგანიზაცია", {"fields": ["organization", "role"]}),)
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("ორგანიზაცია", {"fields": ["organization", "role"]}),
    )


class CarPhotoInline(admin.TabularInline):
    model = CarPhoto
    extra = 0


class LeaseOfferInline(admin.TabularInline):
    model = LeaseOffer
    extra = 0


@admin.register(Car)
class CarAdmin(admin.ModelAdmin):
    list_display = ["__str__", "organization", "external_id", "price_gel", "status", "updated_at"]
    list_filter = ["status", "organization", "fuel"]
    search_fields = ["make", "model", "external_id"]
    inlines = [CarPhotoInline, LeaseOfferInline]


class StatusChangeInline(admin.TabularInline):
    model = StatusChange
    extra = 0
    can_delete = False
    readonly_fields = ["from_status", "to_status", "user", "note", "created_at"]

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    """Status is changed only through Application.change_status, so it's
    read-only here and every change stays in the history."""

    list_display = ["code", "first_name", "last_name", "car", "leasing_company", "status", "created_at"]
    list_filter = ["status", "leasing_company"]
    search_fields = ["code", "last_name"]
    readonly_fields = ["code", "status", "leasing_company", "opened_at", "created_at"]
    inlines = [StatusChangeInline]


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0
    can_delete = False
    readonly_fields = ["application", "amount_gel"]

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["leasing_company", "month", "amount_gel", "status"]
    list_filter = ["status", "leasing_company"]
    readonly_fields = ["leasing_company", "month", "amount_gel"]
    inlines = [InvoiceItemInline]
    actions = ["generate_previous_month"]

    @admin.action(description="წინა თვის ინვოისების შექმნა")
    def generate_previous_month(self, request, queryset):
        month = previous_month()
        invoices = generate_invoices(month)
        self.message_user(request, f"{month:%Y-%m}: განახლდა {len(invoices)} ინვოისი.")
