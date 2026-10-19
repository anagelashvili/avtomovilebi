"""Joining and accounts: partner requests, invitations, setting and
resetting passwords, and a company owner inviting their own staff.

Nobody ever receives a password from someone else: every new account gets an
emailed link to set its own password (the same link as "forgot password").
"""

import logging
import re

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .models import Organization, PartnerRequest, User

log = logging.getLogger(__name__)


# --- Emails

def set_password_link(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return f"{settings.SITE_URL.rstrip('/')}/password/set?uid={uid}&token={token}"


def send_invite(user, invited_by=""):
    org = user.organization.name if user.organization else "avtomobilebi.ge"
    by = f"{invited_by} გიწვევთ " if invited_by else ""
    send_mail(
        subject=f"მოწვევა: {org} · avtomobilebi.ge",
        message=(
            f"გამარჯობა{', ' + user.first_name if user.first_name else ''}!\n\n"
            f"{by}avtomobilebi.ge-ზე, კომპანიის „{org}“ ანგარიშში.\n"
            f"პაროლის დასაყენებლად გახსენით ბმული (მოქმედებს {settings.PASSWORD_RESET_TIMEOUT // 86400} დღე):\n"
            f"{set_password_link(user)}\n\n"
            f"შესვლისას გამოიყენეთ ეს ელ-ფოსტა: {user.email}\n"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_password_reset(user):
    send_mail(
        subject="პაროლის აღდგენა · avtomobilebi.ge",
        message=(
            "მივიღეთ მოთხოვნა თქვენი პაროლის შეცვლაზე. ახალი პაროლის დასაყენებლად გახსენით ბმული:\n"
            f"{set_password_link(user)}\n\n"
            "თუ ეს თქვენ არ მოგითხოვიათ, უბრალოდ უგულებელყავით ეს წერილი.\n"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def invite_after_commit(user, invited_by=""):
    """Sends the invite once the account is saved. A failed email must not
    turn a created account into an error page: it's logged, and the owner can
    press "send again" (or our team can, from the admin)."""

    def send():
        try:
            send_invite(user, invited_by=invited_by)
        except Exception:
            log.exception("Invite email to user %s failed", user.pk)

    transaction.on_commit(send)


# --- Partner requests

def _unique_org_code(tax_id):
    base = f"org-{re.sub(r'[^0-9a-z]', '', tax_id.lower()) or 'new'}"
    code, n = base, 2
    while Organization.objects.filter(code=code).exists():
        code, n = f"{base}-{n}", n + 1
    return code


@transaction.atomic
def approve_partner_request(req):
    """Creates the organisation and the owner's account, then emails the
    owner a link to set a password. Raises ValidationError if it can't."""
    if req.status != PartnerRequest.Status.NEW:
        raise ValidationError(f"„{req}“ უკვე განხილულია.")
    if User.objects.filter(email__iexact=req.email).exists():
        raise ValidationError(f"{req.email} ელ-ფოსტით ანგარიში უკვე არსებობს.")
    org = Organization.objects.create(
        name=req.company_name,
        code=_unique_org_code(req.tax_id),
        is_dealer=req.kind in (PartnerRequest.Kind.DEALER, PartnerRequest.Kind.BOTH),
        is_leasing=req.kind in (PartnerRequest.Kind.LEASING, PartnerRequest.Kind.BOTH),
        phone=req.phone,
        email=req.email,
    )
    user = User(
        username=req.email.lower(), email=req.email.lower(), first_name=req.contact_name,
        organization=org, role=User.Role.OWNER,
    )
    user.set_unusable_password()
    user.save()
    req.status = PartnerRequest.Status.APPROVED
    req.organization = org
    req.save(update_fields=["status", "organization"])
    invite_after_commit(user)
    return org


class PartnerRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerRequest
        fields = ["company_name", "kind", "tax_id", "contact_name", "phone", "email", "message"]

    def validate_tax_id(self, value):
        value = value.strip()
        if not re.fullmatch(r"\d{9}|\d{11}", value):
            raise serializers.ValidationError("საიდენტიფიკაციო კოდი 9 ან 11 ციფრია.")
        return value


class FormThrottle(AnonRateThrottle):
    scope = "public_form"


class PartnerRequestCreate(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [FormThrottle]

    def post(self, request):
        if request.data.get("website"):  # honeypot
            return Response({"detail": "მოთხოვნა ვერ გაიგზავნა."}, status=status.HTTP_400_BAD_REQUEST)
        s = PartnerRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        req = s.save()
        if settings.TEAM_EMAIL:
            transaction.on_commit(lambda: send_mail(
                subject=f"ახალი პარტნიორობის მოთხოვნა: {req.company_name}",
                message=(
                    f"{req.company_name} ({req.get_kind_display()}, ს/კ {req.tax_id})\n"
                    f"{req.contact_name} · {req.phone} · {req.email}\n\n{req.message}\n\n"
                    "დამტკიცება: ადმინი → პარტნიორობის მოთხოვნები."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[settings.TEAM_EMAIL],
                fail_silently=True,
            ))
        else:
            log.info("New partner request %s (TEAM_EMAIL not set)", req.pk)
        return Response({"ok": True}, status=status.HTTP_201_CREATED)


# --- Passwords

class PasswordForgot(APIView):
    """Always answers the same way, so it can't be used to find out which
    emails have accounts."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [FormThrottle]

    def post(self, request):
        email = str(request.data.get("email", "")).strip()
        user = User.objects.filter(email__iexact=email, is_active=True).first() if email else None
        if user:
            send_password_reset(user)
        return Response({"detail": "თუ ეს ელ-ფოსტა რეგისტრირებულია, ბმული გამოგიგზავნეთ."})


class PasswordSet(APIView):
    """The page behind the emailed link: invite or reset."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [FormThrottle]

    def post(self, request):
        try:
            pk = force_str(urlsafe_base64_decode(str(request.data.get("uid", ""))))
            user = User.objects.get(pk=pk, is_active=True)
        except (ValueError, TypeError, OverflowError, User.DoesNotExist):
            user = None
        if user is None or not default_token_generator.check_token(user, str(request.data.get("token", ""))):
            return Response(
                {"detail": "ბმული არასწორია ან ვადა გაუვიდა. მოითხოვეთ ახალი."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        password = str(request.data.get("password", ""))
        try:
            validate_password(password, user)
        except ValidationError as exc:
            return Response({"password": exc.messages}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(password)
        user.save(update_fields=["password"])
        return Response({"username": user.username})


# --- A company owner's own staff

class IsOrgOwner(BasePermission):
    message = "თანამშრომლების მართვა მხოლოდ მფლობელს შეუძლია."

    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.is_owner)


def member_data(u):
    return {
        "id": u.id,
        "name": u.get_full_name() or u.username,
        "email": u.email,
        "role": u.role,
        "role_label": u.get_role_display(),
        "is_active": u.is_active,
        "invited": not u.has_usable_password(),
    }


class InviteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("ამ ელ-ფოსტით ანგარიში უკვე არსებობს.")
        return value.lower()


class OrgMembers(APIView):
    permission_classes = [IsOrgOwner]

    def get(self, request):
        users = request.user.organization.users.order_by("-role", "first_name")
        return Response([member_data(u) for u in users])

    def post(self, request):
        s = InviteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        with transaction.atomic():
            user = User(
                username=s.validated_data["email"], email=s.validated_data["email"],
                first_name=s.validated_data["first_name"], last_name=s.validated_data.get("last_name", ""),
                organization=request.user.organization, role=User.Role.MANAGER,
            )
            user.set_unusable_password()
            user.save()
            invite_after_commit(user, invited_by=request.user.get_full_name() or request.user.username)
        return Response(member_data(user), status=status.HTTP_201_CREATED)


class OrgMemberActive(APIView):
    """Turn a manager's access off or on (owners can't lock each other out)."""

    permission_classes = [IsOrgOwner]

    def post(self, request, pk):
        user = get_object_or_404(request.user.organization.users, pk=pk, role=User.Role.MANAGER)
        user.is_active = bool(request.data.get("is_active"))
        user.save(update_fields=["is_active"])
        return Response(member_data(user))


class OrgMemberReinvite(APIView):
    permission_classes = [IsOrgOwner]

    def post(self, request, pk):
        user = get_object_or_404(request.user.organization.users, pk=pk, is_active=True)
        send_invite(user, invited_by=request.user.get_full_name() or request.user.username)
        return Response({"detail": "მოწვევა თავიდან გაიგზავნა."})
