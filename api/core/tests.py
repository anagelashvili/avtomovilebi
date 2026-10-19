import shutil
import tempfile
from io import BytesIO, StringIO

from datetime import date, timedelta
from decimal import Decimal

from django.core import mail
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.db import connection
from django.test import TestCase, override_settings
from django.utils import timezone
from openpyxl import Workbook
from PIL import Image
from rest_framework.test import APIClient

from .excel_import import COLUMNS, ImportFileError, import_cars
from .invoicing import generate_invoices
from .models import Application, Car, Invoice, LeaseOffer, Organization, StatusChange, User

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

    def test_errors_are_in_georgian(self):
        r = self.client.post("/api/dealer/cars/", {"year": "abc"}, format="json")
        self.assertEqual(r.json()["year"], ["მიუთითეთ რიცხვი."])
        self.assertTrue(all(not m.isascii() for m in r.json()["make"]))  # Django's own Georgian wording
        self.assertEqual(APIClient().get("/api/dealer/cars/").json()["detail"], "გთხოვთ, შეხვიდეთ სისტემაში.")

    def test_non_image_upload_is_refused(self):
        car = make_car(self.dealer)
        fake = SimpleUploadedFile("x.jpg", b"not an image", content_type="image/jpeg")
        r = self.client.post(f"/api/dealer/cars/{car.id}/photos/", {"image": fake}, format="multipart")
        self.assertEqual(r.status_code, 400)


class PublicApiTests(TestCase):
    def setUp(self):
        cache.clear()  # throttle counters
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

    def test_honeypot_and_rate_limit(self):
        self.assertEqual(self.application(website="http://spam").status_code, 400)
        cache.clear()
        codes = [self.application().status_code for _ in range(6)]
        self.assertEqual(codes, [201] * 5 + [429])

    @override_settings(INTERNAL_API_TOKEN="secret")
    def test_rate_limit_is_per_forwarded_visitor_ip(self):
        def post(ip, token="secret"):
            return self.client.post(
                "/api/public/applications/",
                dict(car=self.ix3.id, offer=self.offer_a.id, first_name="ა", last_name="ბ",
                     personal_id="01001012345", phone="555123456", consent=True),
                format="json", HTTP_X_INTERNAL_TOKEN=token, HTTP_X_CLIENT_IP=ip,
            ).status_code
        self.assertEqual([post("1.1.1.1") for _ in range(6)][-1], 429)
        self.assertEqual(post("2.2.2.2"), 201)  # another visitor is not blocked
        # Without the right token the claimed IP is ignored: all count as the caller's own IP.
        codes = [post(f"9.9.9.{i}", token="wrong") for i in range(6)]
        self.assertEqual(codes[-1], 429)


class LeasingTests(TestCase):
    def setUp(self):
        cache.clear()
        dealer = Organization.objects.create(name="D", code="d", is_dealer=True)
        self.a = Organization.objects.create(
            name="A", code="a", is_leasing=True, commission_type="percent", commission_value=Decimal("1.5")
        )
        self.b = Organization.objects.create(name="B", code="b", is_leasing=True, commission_value=Decimal("300"))
        self.car = make_car(dealer, price_gel=80000, status=Car.Status.ACTIVE)
        offer_a = LeaseOffer.objects.create(car=self.car, leasing_company=self.a, term_months=36, down_payment_gel=0, monthly_gel=2500)
        offer_b = LeaseOffer.objects.create(car=self.car, leasing_company=self.b, term_months=36, down_payment_gel=0, monthly_gel=2600)
        base = dict(car=self.car, first_name="ნინო", last_name="ბერიძე", personal_id="01001012345", phone="555123456", consent_at=timezone.now())
        self.app = Application.objects.create(offer=offer_a, **base)
        self.other = Application.objects.create(offer=offer_b, **base)
        self.manager = User.objects.create_user("m", password="x", organization=self.a, first_name="გიორგი")
        self.client = APIClient()
        self.client.force_authenticate(self.manager)

    def test_list_hides_code_and_details_until_opened(self):
        rows = self.client.get("/api/leasing/applications/").json()
        self.assertEqual(len(rows), 1)  # only this company's applications
        self.assertEqual(rows[0]["code"], "GL-•••••")
        self.assertNotIn("personal_id", rows[0])
        self.assertNotIn("123456", rows[0]["phone"])
        self.assertEqual(self.client.get(f"/api/leasing/applications/{self.app.code}/").status_code, 404)

    def test_open_with_code_reveals_details_logs_and_texts_client(self):
        with self.assertLogs("core.notify", "INFO") as logs, self.captureOnCommitCallbacks(execute=True):
            r = self.client.post("/api/leasing/applications/open/", {"code": self.app.code.lower().replace("-", " ")}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual((r.json()["personal_id"], r.json()["status"]), ("01001012345", "arrived"))
        self.assertIn("გახსნა", logs.output[0])
        self.assertEqual(self.client.get("/api/leasing/applications/").json()[0]["code"], self.app.code)
        self.assertEqual(StatusChange.objects.get(application=self.app).user, self.manager)

    def test_cannot_open_another_companys_code_and_guessing_is_limited(self):
        r = self.client.post("/api/leasing/applications/open/", {"code": self.other.code}, format="json")
        self.assertEqual(r.status_code, 404)
        codes = [self.client.post("/api/leasing/applications/open/", {"code": "GL-00000"}, format="json").status_code for _ in range(30)]
        self.assertEqual(codes[-1], 429)

    def test_status_flow_through_api(self):
        self.client.post("/api/leasing/applications/open/", {"code": self.app.code}, format="json")
        url = f"/api/leasing/applications/{self.app.code}/status/"
        self.assertEqual(self.client.post(url, {"status": "signed"}, format="json").status_code, 400)
        r = self.client.post(url, {"status": "signed", "contract_number": "77/2026"}, format="json")
        self.assertEqual((r.status_code, r.json()["status"]), (200, "signed"))

    def sign(self, app, when):
        app.change_status("arrived", self.manager)
        app.change_status("signed", self.manager, contract_number="1")
        Application.objects.filter(pk=app.pk).update(signed_at=when)

    def test_invoices_once_per_deal_with_commission_rules(self):
        sept = timezone.make_aware(timezone.datetime(2026, 9, 15, 12))
        self.sign(self.app, sept)
        self.sign(self.other, sept)
        generate_invoices(date(2026, 9, 1))
        generate_invoices(date(2026, 9, 1))  # running twice adds nothing
        inv_a = Invoice.objects.get(leasing_company=self.a)
        self.assertEqual((inv_a.items.count(), inv_a.amount_gel), (1, Decimal("1200.00")))  # 1.5% of 80 000
        self.assertEqual(Invoice.objects.get(leasing_company=self.b).amount_gel, Decimal("300.00"))
        self.assertFalse(generate_invoices(date(2026, 10, 1)))

        r = self.client.get(f"/api/leasing/invoices/{inv_a.id}/").json()
        self.assertEqual((r["items"][0]["code"], r["amount_gel"]), (self.app.code, "1200.00"))
        inv_b = Invoice.objects.get(leasing_company=self.b)
        self.assertEqual(self.client.get(f"/api/leasing/invoices/{inv_b.id}/").status_code, 404)

    def test_staff_overview_and_suspicious(self):
        self.assertEqual(self.client.get("/api/staff/overview/").status_code, 403)
        staff = User.objects.create_user("s", password="x", is_staff=True)
        c = APIClient()
        c.force_authenticate(staff)
        self.app.change_status("arrived", self.manager)
        Application.objects.filter(pk=self.app.pk).update(status_changed_at=timezone.now() - timedelta(days=31))
        month = f"{timezone.localdate():%Y-%m}"
        data = c.get(f"/api/staff/overview/?month={month}").json()
        row_a = next(r for r in data["companies"] if r["company"] == "A")
        self.assertEqual((row_a["applications"], row_a["arrived"]), (1, 1))
        self.assertEqual([s["code"] for s in data["suspicious"]], [self.app.code])


class AccountTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def request_partner(self, **kw):
        data = dict(company_name="შპს ავტო", kind="dealer", tax_id="404123456", contact_name="ნიკა",
                    phone="555111222", email="Nika@Example.com", message="")
        data.update(kw)
        return self.client.post("/api/public/partner-requests/", data, format="json")

    def link_parts(self, body):
        import re
        m = re.search(r"/password/set\?uid=([^&\s]+)&token=(\S+)", body)
        return m.group(1), m.group(2)

    def test_partner_request_validation_and_honeypot(self):
        self.assertEqual(self.request_partner(tax_id="12").status_code, 400)
        self.assertEqual(self.request_partner(website="x").status_code, 400)
        self.assertEqual(self.request_partner().status_code, 201)

    @override_settings(TEAM_EMAIL="team@example.com")
    def test_approval_creates_org_and_owner_who_sets_own_password(self):
        from .accounts import approve_partner_request
        from .models import PartnerRequest
        with self.captureOnCommitCallbacks(execute=True):
            self.request_partner()
        self.assertEqual(mail.outbox[-1].to, ["team@example.com"])
        req = PartnerRequest.objects.get()
        with self.captureOnCommitCallbacks(execute=True):
            org = approve_partner_request(req)
        self.assertTrue(org.is_dealer and not org.is_leasing)
        owner = User.objects.get(organization=org)
        self.assertEqual((owner.role, owner.has_usable_password()), ("owner", False))
        with self.assertRaises(ValidationError):
            approve_partner_request(req)  # only once

        uid, token = self.link_parts(mail.outbox[-1].body)
        weak = self.client.post("/api/auth/password/set/", {"uid": uid, "token": token, "password": "123"}, format="json")
        self.assertEqual(weak.status_code, 400)
        ok = self.client.post("/api/auth/password/set/", {"uid": uid, "token": token, "password": "ahali-paroli-2026"}, format="json")
        self.assertEqual(ok.status_code, 200)
        again = self.client.post("/api/auth/password/set/", {"uid": uid, "token": token, "password": "sxva-paroli-2026"}, format="json")
        self.assertEqual(again.status_code, 400)  # links work once
        r = self.client.post("/api/auth/login/", {"username": "nika@example.com", "password": "ahali-paroli-2026"}, format="json")
        self.assertEqual(r.status_code, 200)  # email works as login

    def test_forgot_password_does_not_reveal_accounts(self):
        User.objects.create_user("u", email="u@example.com", password="old-paroli-123")
        a = self.client.post("/api/auth/password/forgot/", {"email": "u@example.com"}, format="json")
        b = self.client.post("/api/auth/password/forgot/", {"email": "nobody@example.com"}, format="json")
        self.assertEqual((a.status_code, a.json()), (b.status_code, b.json()))
        self.assertEqual(len(mail.outbox), 1)

    def test_failed_invite_email_does_not_break_the_invite(self):
        from unittest import mock
        org = Organization.objects.create(name="L", code="l", is_leasing=True)
        c = APIClient()
        c.force_authenticate(User.objects.create_user("o", organization=org, role="owner"))
        with mock.patch("core.accounts.send_invite", side_effect=OSError("smtp down")), \
                self.assertLogs("core.accounts", "ERROR"), self.captureOnCommitCallbacks(execute=True):
            r = c.post("/api/org/members/", {"email": "a@example.com", "first_name": "ა"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertTrue(User.objects.filter(email="a@example.com").exists())

    def test_owner_invites_and_manages_staff(self):
        org = Organization.objects.create(name="L", code="l", is_leasing=True)
        owner = User.objects.create_user("o", organization=org, role="owner")
        manager = User.objects.create_user("m", organization=org)
        other = User.objects.create_user("x", organization=Organization.objects.create(name="O", code="o"))
        c = APIClient()
        c.force_authenticate(manager)
        self.assertEqual(c.get("/api/org/members/").status_code, 403)  # managers can't
        c.force_authenticate(owner)
        with self.captureOnCommitCallbacks(execute=True):
            r = c.post("/api/org/members/", {"email": "New@Example.com", "first_name": "ანა"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(User.objects.get(email="new@example.com").organization, org)
        self.assertIn("/password/set?uid=", mail.outbox[-1].body)
        self.assertEqual(c.post("/api/org/members/", {"email": "new@example.com", "first_name": "ა"}, format="json").status_code, 400)
        self.assertFalse(c.post(f"/api/org/members/{manager.id}/active/", {"is_active": False}, format="json").json()["is_active"])
        self.assertEqual(c.post(f"/api/org/members/{other.id}/active/", {"is_active": False}, format="json").status_code, 404)
        self.assertEqual(c.post(f"/api/org/members/{owner.id}/active/", {"is_active": False}, format="json").status_code, 404)


class ReminderTests(TestCase):
    def test_morning_email_goes_to_dealer_users(self):
        dealer = Organization.objects.create(name="D", code="d", is_dealer=True)
        make_car(dealer, status=Car.Status.DRAFT)
        User.objects.create_user("d", email="d@example.com", organization=dealer)
        User.objects.create_user("noemail", organization=dealer)
        call_command("send_dealer_reminders", stdout=StringIO())
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("/dealer/import", mail.outbox[0].body)
        self.assertIn("დრაფტ", mail.outbox[0].body)
