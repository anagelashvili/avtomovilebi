from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import (
    Application, Car, CarPhoto, Invoice, LeaseOffer, Organization, StatusChange, User,
)


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "is_dealer", "is_leasing", "phone"]
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


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["leasing_company", "month", "amount_gel", "status"]
    list_filter = ["status", "leasing_company"]
    filter_horizontal = ["applications"]
