from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import public, views

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
    path("dealer/import/", views.ExcelImportView.as_view()),
    path("dealer/import/template/", views.ExcelTemplateView.as_view()),
    path("", include(router.urls)),
]
