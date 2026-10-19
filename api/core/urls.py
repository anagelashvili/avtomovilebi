from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import accounts, leasing, public, views

router = DefaultRouter()
router.register("dealer/cars", views.DealerCarViewSet, basename="dealer-car")

urlpatterns = [
    path("health/", views.health),
    path("public/cars/", public.PublicCarList.as_view()),
    path("public/cars/<int:pk>/", public.PublicCarDetail.as_view()),
    path("public/filters/", public.PublicFilters.as_view()),
    path("public/applications/", public.PublicApplicationCreate.as_view()),
    path("auth/csrf/", views.CsrfView.as_view()),
    path("auth/login/", views.LoginView.as_view()),
    path("auth/logout/", views.LogoutView.as_view()),
    path("auth/me/", views.MeView.as_view()),
    path("auth/password/forgot/", accounts.PasswordForgot.as_view()),
    path("auth/password/set/", accounts.PasswordSet.as_view()),
    path("public/partner-requests/", accounts.PartnerRequestCreate.as_view()),
    path("org/members/", accounts.OrgMembers.as_view()),
    path("org/members/<int:pk>/active/", accounts.OrgMemberActive.as_view()),
    path("org/members/<int:pk>/reinvite/", accounts.OrgMemberReinvite.as_view()),
    path("dealer/import/", views.ExcelImportView.as_view()),
    path("dealer/import/template/", views.ExcelTemplateView.as_view()),
    path("leasing/applications/", leasing.LeasingApplications.as_view()),
    path("leasing/applications/open/", leasing.LeasingOpenCode.as_view()),
    path("leasing/applications/<str:code>/", leasing.LeasingApplicationDetail.as_view()),
    path("leasing/applications/<str:code>/status/", leasing.LeasingApplicationStatus.as_view()),
    path("leasing/invoices/", leasing.LeasingInvoices.as_view()),
    path("leasing/invoices/<int:pk>/", leasing.LeasingInvoiceDetail.as_view()),
    path("staff/overview/", leasing.StaffOverview.as_view()),
    path("staff/invoices/generate/", leasing.StaffGenerateInvoices.as_view()),
    path("staff/invoices/<int:pk>/status/", leasing.StaffInvoiceStatus.as_view()),
    path("", include(router.urls)),
]
