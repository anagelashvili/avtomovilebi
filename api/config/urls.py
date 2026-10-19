from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

admin.site.site_header = "avtomobilebi.ge · ადმინი"
admin.site.site_title = "avtomobilebi.ge"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
