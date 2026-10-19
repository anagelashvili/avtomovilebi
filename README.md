# avtomobilebi.ge

Leasing marketplace: dealers list cars, buyers compare leasing offers and send
one application, leasing companies open it with a code (GL-XXXXX).

- `api/` – Django + Django REST Framework: data, rules, Excel import, admin.
- `web/` – Next.js site and panels (not started yet).

Plan: `project_plan.docx`.

## Running the API locally

```bash
cd api
py -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python manage.py migrate
.venv/Scripts/python manage.py createsuperuser
.venv/Scripts/python manage.py runserver
```

Admin: http://127.0.0.1:8000/admin/ · Tests: `.venv/Scripts/python manage.py test core`

## API so far (phase 1: foundation)

| Method | Path | What |
|---|---|---|
| GET | `/api/auth/csrf/` | sets the CSRF cookie |
| POST | `/api/auth/login/` · `/api/auth/logout/` | session login |
| GET | `/api/auth/me/` | current user and organisation |
| GET/POST | `/api/dealer/cars/` | the dealer's own cars |
| GET/PATCH/DELETE | `/api/dealer/cars/{id}/` | one car |
| POST | `/api/dealer/cars/{id}/publish/` · `unpublish/` | needs at least one photo |
| POST | `/api/dealer/cars/{id}/photos/` | upload (`image`, several allowed) |
| POST | `/api/dealer/cars/{id}/photos/order/` | `{"ids": [...]}`, first = main |
| DELETE | `/api/dealer/cars/{id}/photos/{photo_id}/` | |
| GET | `/api/dealer/import/template/` | Excel template |
| POST | `/api/dealer/import/` | `file`; `commit=1` saves, otherwise only checks |

## Rules built in

- Dealer and leasing company are flags on one `Organization`, so the open
  question in the plan can go either way without a schema change.
- Personal ID number and phone are encrypted in the database
  (`FIELD_ENCRYPTION_KEY`).
- Application status only moves new → arrived → signed/rejected; "signed"
  needs a contract number; every change is logged with who and when.
- Cars without photos stay drafts.
