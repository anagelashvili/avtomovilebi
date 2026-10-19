import shutil
import tempfile
from io import BytesIO

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test import TestCase, override_settings
from django.utils import timezone
from openpyxl import Workbook
from PIL import Image
from rest_framework.test import APIClient

from .excel_import import COLUMNS, ImportFileError, import_cars
from .models import Application, Car, LeaseOffer, Organization, StatusChange, User

HEADERS = list(COLUMNS)


def xlsx(rows, headers=HEADERS):
    wb = Workbook()
    ws = wb.active
    ws.append(headers)
    for r in rows:
        ws.append(r)
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return SimpleUploadedFile(
        "cars.xlsx", buf.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


def png():
    buf = BytesIO()
    Image.new("RGB", (8, 8), "red").save(buf, "PNG")
    return SimpleUploadedFile("car.png", buf.getvalue(), content_type="image/png")


ROW_IX3 = ["A-101", "BMW", "iX3", 2025, "ჯიპი", "ელექტრო", "", "ავტომატური", "8 900", "85 000 ლ", "თბილისი"]
ROW_PRIUS = ["A-102", "Toyota", "Prius", 2015, "", "ჰიბრიდი", "1.8", "ავტომატური", 120000, 18500, "ბათუმი"]


def make_car(org, **kw):
    data = dict(
        external_id="X-1", make="BMW", model="iX3", year=2025, fuel="electric",
        transmission="automatic", mileage_km=1, price_gel=1, city="თბილისი",
    )
    data.update(kw)
    return Car.objects.create(organization=org, **data)


class ExcelImportTests(TestCase):
    def setUp(self):
        self.dealer = Organization.objects.create(name="Dealer", code="dealer", is_dealer=True)

    def test_preview_does_not_save(self):
        result = import_cars(self.dealer, xlsx([ROW_IX3, ROW_PRIUS]))
        self.assertEqual(result.counts, {"new": 2, "updated": 0, "error": 0})
        self.assertFalse(Car.objects.exists())

    def test_commit_saves_valid_rows_as_drafts_and_parses_numbers(self):
        import_cars(self.dealer, xlsx([ROW_IX3, ROW_PRIUS]), commit=True)
        car = Car.objects.get(external_id="A-101")
        self.assertEqual((car.price_gel, car.mileage_km, car.fuel, car.body), (85000, 8900, "electric", "suv"))
        self.assertEqual(Car.objects.get(external_id="A-102").body, "")
        self.assertEqual(car.status, Car.Status.DRAFT)

    def test_errors_are_reported_per_row_and_skipped(self):
        bad = ["A-104", "BMW", "320i", 2016, "სედანი", "ბენზინი", "", "ავტომატური", 150000, "", "თბილისი"]
        result = import_cars(self.dealer, xlsx([ROW_IX3, bad]), commit=True)
        err = result.rows[1]
        self.assertEqual((err.action, err.row), ("error", 3))
        self.assertIn("ფასი აკლია", err.errors)
        self.assertEqual(list(Car.objects.values_list("external_id", flat=True)), ["A-101"])

    def test_unknown_fuel_and_duplicate_id(self):
        weird = ROW_PRIUS.copy()
        weird[HEADERS.index("საწვავი")] = "წყალბადი"
        result = import_cars(self.dealer, xlsx([ROW_IX3, weird, ROW_IX3]))
        self.assertEqual([r.action for r in result.rows], ["new", "error", "error"])
        self.assertTrue(any("უცნობია" in e for e in result.rows[1].errors))
        self.assertTrue(any("ორჯერ" in e for e in result.rows[2].errors))

    def test_existing_car_is_updated_and_keeps_status(self):
        car = make_car(self.dealer, external_id="A-101", price_gel=90000, status=Car.Status.ACTIVE)
        result = import_cars(self.dealer, xlsx([ROW_IX3]), commit=True)
        self.assertEqual(result.rows[0].action, "updated")
        car.refresh_from_db()
        self.assertEqual((car.price_gel, car.status), (85000, Car.Status.ACTIVE))

    def test_same_id_at_another_dealer_is_a_new_car(self):
        other = Organization.objects.create(name="Other", code="other", is_dealer=True)
        make_car(other, external_id="A-101")
        result = import_cars(self.dealer, xlsx([ROW_IX3]))
        self.assertEqual(result.rows[0].action, "new")

    def test_missing_columns_and_bad_file(self):
        with self.assertRaisesMessage(ImportFileError, "ფასი"):
            import_cars(self.dealer, xlsx([], headers=[h for h in HEADERS if h != "ფასი"]))
        with self.assertRaises(ImportFileError):
            import_cars(self.dealer, SimpleUploadedFile("x.xlsx", b"not excel"))


class ApplicationTests(TestCase):
    def setUp(self):
        dealer = Organization.objects.create(name="D", code="d", is_dealer=True)
        self.leasing = Organization.objects.create(name="L", code="l", is_leasing=True)
        car = make_car(dealer)
        offer = LeaseOffer.objects.create(
            car=car, leasing_company=self.leasing, term_months=36, down_payment_gel=0, monthly_gel=3103
        )
        self.manager = User.objects.create_user("m", password="x", organization=self.leasing)
        self.app = Application.objects.create(
            car=car, offer=offer, first_name="ნინო", last_name="ბერიძე",
            personal_id="01001012345", phone="555123456", consent_at=timezone.now(),
        )

    def test_code_and_company_are_set(self):
        self.assertRegex(self.app.code, r"^GL-\d{5}$")
        self.assertEqual(self.app.leasing_company, self.leasing)

    def test_personal_data_is_encrypted_at_rest(self):
        with connection.cursor() as c:
            c.execute("SELECT personal_id, phone FROM core_application WHERE id=%s", [self.app.id])
            raw_id, raw_phone = c.fetchone()
        self.assertNotIn("01001012345", raw_id)
        self.assertNotIn("555123456", raw_phone)
        self.assertEqual(Application.objects.get(pk=self.app.pk).personal_id, "01001012345")

    def test_signed_requires_contract_number(self):
        self.app.change_status(Application.Status.ARRIVED, self.manager)
        with self.assertRaises(ValidationError):
            self.app.change_status(Application.Status.SIGNED, self.manager, contract_number="  ")
        self.app.change_status(Application.Status.SIGNED, self.manager, contract_number="№ 77")
        self.assertEqual(self.app.contract_number, "№ 77")

    def test_every_change_is_logged_and_invalid_jumps_refused(self):
        with self.assertRaises(ValidationError):
            self.app.change_status(Application.Status.SIGNED, self.manager, contract_number="1")
        self.app.change_status(Application.Status.ARRIVED, self.manager)
        self.assertIsNotNone(self.app.opened_at)
        log = StatusChange.objects.get(application=self.app)
        self.assertEqual((log.from_status, log.to_status, log.user), ("new", "arrived", self.manager))


MEDIA = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=MEDIA)
class DealerApiTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        self.dealer = Organization.objects.create(name="D", code="d", is_dealer=True)
        self.other = Organization.objects.create(name="O", code="o", is_dealer=True)
        self.leasing = Organization.objects.create(name="L", code="l", is_leasing=True)
        self.user = User.objects.create_user("dealer", password="pw-123456", organization=self.dealer)
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_login_and_me(self):
        c = APIClient()
        self.assertEqual(c.post("/api/auth/login/", {"username": "dealer", "password": "bad"}).status_code, 400)
        r = c.post("/api/auth/login/", {"username": "dealer", "password": "pw-123456"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(c.get("/api/auth/me/").json()["organization"]["code"], "d")

    def test_only_dealers_and_only_own_cars(self):
        make_car(self.dealer, external_id="mine")
        make_car(self.other, external_id="theirs")
        ids = [c["external_id"] for c in self.client.get("/api/dealer/cars/").json()]
        self.assertEqual(ids, ["mine"])

        leasing_user = User.objects.create_user("l", password="x", organization=self.leasing)
        c = APIClient()
        c.force_authenticate(leasing_user)
        self.assertEqual(c.get("/api/dealer/cars/").status_code, 403)
        self.assertEqual(APIClient().get("/api/dealer/cars/").status_code, 403)

    def test_cannot_touch_another_dealers_car(self):
        theirs = make_car(self.other, external_id="theirs")
        self.assertEqual(self.client.patch(f"/api/dealer/cars/{theirs.id}/", {"price_gel": 1}).status_code, 404)

    def test_import_endpoint_preview_then_commit(self):
        r = self.client.post("/api/dealer/import/", {"file": xlsx([ROW_IX3])}, format="multipart")
        self.assertEqual((r.status_code, r.json()["counts"]["new"]), (200, 1))
        self.assertFalse(Car.objects.exists())
        self.client.post("/api/dealer/import/", {"file": xlsx([ROW_IX3]), "commit": "1"}, format="multipart")
        self.assertEqual(Car.objects.get().organization, self.dealer)

    def test_template_download(self):
        r = self.client.get("/api/dealer/import/template/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("attachment", r["Content-Disposition"])

    def test_publish_needs_photo_and_photo_flow(self):
        car = make_car(self.dealer)
        self.assertEqual(self.client.post(f"/api/dealer/cars/{car.id}/publish/").status_code, 400)

        r = self.client.post(f"/api/dealer/cars/{car.id}/photos/", {"image": [png(), png()]}, format="multipart")
        self.assertEqual(r.status_code, 201, r.content)
        photo_ids = [p["id"] for p in r.json()["photos"]]
        self.assertEqual(len(photo_ids), 2)

        r = self.client.post(f"/api/dealer/cars/{car.id}/photos/order/", {"ids": photo_ids[::-1]}, format="json")
        self.assertEqual(r.json()["photos"][0]["id"], photo_ids[1])

        self.assertEqual(self.client.post(f"/api/dealer/cars/{car.id}/publish/").json()["status"], "active")

        for pid in photo_ids:
            self.client.delete(f"/api/dealer/cars/{car.id}/photos/{pid}/")
        car.refresh_from_db()
        self.assertEqual(car.status, Car.Status.DRAFT)

    def test_non_image_upload_is_refused(self):
        car = make_car(self.dealer)
        fake = SimpleUploadedFile("x.jpg", b"not an image", content_type="image/jpeg")
        r = self.client.post(f"/api/dealer/cars/{car.id}/photos/", {"image": fake}, format="multipart")
        self.assertEqual(r.status_code, 400)


class PublicApiTests(TestCase):
    def setUp(self):
        self.dealer = Organization.objects.create(name="D", code="d", is_dealer=True)
        self.a = Organization.objects.create(name="კომპანია A", code="a", is_leasing=True)
        self.b = Organization.objects.create(name="კომპანია B", code="b", is_leasing=True)
        self.ix3 = make_car(self.dealer, external_id="1", price_gel=85000, status=Car.Status.ACTIVE, body="suv")
        self.vette = make_car(
            self.dealer, external_id="2", make="Chevrolet", model="Corvette", fuel="petrol",
            price_gel=98000, status=Car.Status.ACTIVE, body="coupe",
        )
        self.draft = make_car(self.dealer, external_id="3", status=Car.Status.DRAFT)
        self.no_offer = make_car(self.dealer, external_id="4", status=Car.Status.ACTIVE)
        self.offer_a = LeaseOffer.objects.create(car=self.ix3, leasing_company=self.a, term_months=36, down_payment_gel=0, monthly_gel=3103)
        LeaseOffer.objects.create(car=self.ix3, leasing_company=self.b, term_months=48, down_payment_gel=0, monthly_gel=2900)
        LeaseOffer.objects.create(car=self.vette, leasing_company=self.a, term_months=36, down_payment_gel=0, monthly_gel=3577)
        LeaseOffer.objects.create(car=self.draft, leasing_company=self.a, term_months=36, down_payment_gel=0, monthly_gel=1)
        self.client = APIClient()

    def ids(self, query=""):
        return [c["id"] for c in self.client.get(f"/api/public/cars/{query}").json()["results"]]

    def test_only_active_cars_with_offers_once_each(self):
        self.assertCountEqual(self.ids(), [self.ix3.id, self.vette.id])
        card = next(c for c in self.client.get("/api/public/cars/").json()["results"] if c["id"] == self.ix3.id)
        self.assertEqual(card["monthly_from"], 2900)
        self.assertEqual(card["companies"], ["კომპანია A", "კომპანია B"])

    def test_filters_and_sort(self):
        self.assertEqual(self.ids("?make=bmw"), [self.ix3.id])
        self.assertEqual(self.ids("?body=coupe"), [self.vette.id])
        self.assertEqual(self.ids("?fuel=petrol&fuel=diesel"), [self.vette.id])
        self.assertEqual(self.ids("?monthly_max=3000"), [self.ix3.id])
        self.assertEqual(self.ids("?company=b"), [self.ix3.id])
        self.assertEqual(self.ids("?sort=price_desc"), [self.vette.id, self.ix3.id])
        self.assertEqual(self.ids("?price_max=abc"), self.ids())  # junk is ignored

    def test_detail_hides_drafts(self):
        self.assertEqual(self.client.get(f"/api/public/cars/{self.ix3.id}/").json()["offers"][0]["monthly_gel"], 2900)
        self.assertEqual(self.client.get(f"/api/public/cars/{self.draft.id}/").status_code, 404)

    def application(self, **kw):
        data = dict(
            car=self.ix3.id, offer=self.offer_a.id, first_name="ნინო", last_name="ბერიძე",
            personal_id="01001012345", phone="+995 555 12 34 56", email="nino@example.com", consent=True,
        )
        data.update(kw)
        return self.client.post("/api/public/applications/", data, format="json")

    def test_application_is_created_and_notified(self):
        from django.core import mail
        with self.captureOnCommitCallbacks(execute=True):
            r = self.application()
        self.assertEqual(r.status_code, 201, r.content)
        app = Application.objects.get(code=r.json()["code"])
        self.assertEqual((app.phone, app.leasing_company), ("555123456", self.a))
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(app.code, mail.outbox[0].body)
        self.assertNotIn("personal_id", r.json())

    def test_application_validation(self):
        self.assertEqual(self.application(personal_id="123").status_code, 400)
        self.assertEqual(self.application(phone="032 2 00 00 00").status_code, 400)
        self.assertEqual(self.application(consent=False).status_code, 400)
        other_offer = LeaseOffer.objects.get(car=self.vette)
        self.assertEqual(self.application(offer=other_offer.id).status_code, 400)
        self.assertEqual(self.application(car=self.draft.id).status_code, 400)
        self.assertFalse(Application.objects.exists())
