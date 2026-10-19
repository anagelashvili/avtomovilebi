from rest_framework.permissions import BasePermission


class IsDealer(BasePermission):
    message = "ეს გვერდი მხოლოდ დილერებისთვისაა."

    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.is_dealer)


class IsLeasing(BasePermission):
    message = "ეს გვერდი მხოლოდ ლიზინგ კომპანიებისთვისაა."

    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.is_leasing)
