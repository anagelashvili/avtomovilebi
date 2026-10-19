# avtomobilebi.ge

Leasing marketplace: dealers list cars, buyers compare leasing offers and send
one application, leasing companies open it with a code (GL-XXXXX).

- `api/` – Django + Django REST Framework: data, rules, Excel import, invoices, admin.
- `web/` – Next.js 16: public site, login, dealer / leasing / team panels.

Plan: `project_plan.docx`.

## Running locally

Two terminals (PowerShell or bash):

```bash
cd api
py -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python manage.py migrate
.venv/Scripts/python manage.py seed_demo --photos path/to/mockup/photos   # optional demo data
.venv/Scripts/python manage.py runserver
```

```bash
cd web
npm install
npm run dev
```

- Site: http://localhost:3000 · Login: http://localhost:3000/login
- Demo logins (after `seed_demo`): `.demo-logins.txt` (git-ignored)
- Django admin: http://127.0.0.1:8000/admin/ (`manage.py createsuperuser`)
- Tests: `.venv/Scripts/python manage.py test core` · `npx tsc --noEmit` · `npx eslint .`

The site proxies `/api/*` and `/media/*` to Django (`web/next.config.ts`), so
the browser only ever talks to one domain and the login cookie is shared.

## Screens

| Who | Path | Design screen |
|---|---|---|
| Buyer | `/`, `/cars`, `/cars/{id}` | home, catalog, car page + application |
| Dealer | `/dealer/cars`, `/dealer/cars/new`, `/dealer/cars/{id}` | 9, 10 |
| Dealer | `/dealer/import`, `/dealer/photos` | 8, 8b |
| Leasing company | `/leasing`, `/leasing/applications/{code}` | 3, 4 |
| Leasing company | `/leasing/invoices`, `/leasing/invoices/{id}` | 5 |
| Our team | `/overview` (is_staff users) | 6 |

"PDF" buttons use the browser's print dialog ("Save as PDF").

## Rules built in

- Dealer and leasing company are flags on one `Organization`, so the open
  question in the plan can go either way without a schema change.
- Personal ID number and phone are encrypted in the database
  (`FIELD_ENCRYPTION_KEY`).
- A leasing company sees only the client's name (code and phone masked) until
  it enters the code the client says in person; enforced in the API.
  Code guessing is limited per user (`THROTTLE_OPEN_CODE`, default 30/hour).
- Application status only moves new → arrived → signed/rejected; "signed"
  needs a contract number; every change is logged with who and when.
- Cars without photos stay drafts.
- Applications: honeypot field + limit per visitor IP (`THROTTLE_APPLY`,
  default 5/hour). The site passes the visitor IP with `INTERNAL_API_TOKEN`.
- Commission is set per leasing company in the admin: fixed amount or percent
  of the car price. A deal counts in the month it was marked signed; each
  deal is invoiced once; paid invoices are never changed.

## Scheduled jobs (host cron)

| When | Command |
|---|---|
| 1st of each month | `python manage.py generate_invoices` (previous month) |
| Weekdays, morning | `python manage.py send_dealer_reminders` |

## Deploying

Needs accounts on GitHub, Vercel, Railway (or Render) and Cloudflare R2.

1. Push this repository to GitHub.
2. **API on Railway**: new project from the repo, root directory `api`, add a
   PostgreSQL database (it sets `DATABASE_URL`). Set the variables from
   `api/.env.example`. The `Procfile` runs migrations, collects static files
   and starts gunicorn. Add the two cron jobs above. Create the first admin
   with `python manage.py createsuperuser` in Railway's shell.
3. **Photos on Cloudflare R2**: create a bucket with a public custom domain
   (e.g. `photos.avtomobilebi.ge`) and an API token; fill the `S3_*` variables.
4. **Site on Vercel**: import the repo, root directory `web`. Set `API_URL`
   (the Railway URL, later `https://api.avtomobilebi.ge`),
   `INTERNAL_API_TOKEN` (same value as the API) and `PHOTOS_HOST`.
5. **Domain**: point `avtomobilebi.ge` at Vercel and `api.avtomobilebi.ge` at
   Railway (each shows the DNS records to add at the domain registrar).
6. **Email / SMS**: fill the `EMAIL_*` variables. SMS is only logged until a
   provider is chosen: replace the body of `send_sms` in `api/core/notify.py`.

## Still open (decisions for the business)

See `project_plan.docx` §8: commission amounts, when a deal counts, photo
rule, final Excel columns, brand, SMS provider, legal texts (privacy, terms),
and how leasing offers per car are created (today: Django admin only).
