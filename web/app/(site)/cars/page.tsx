import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MonthlyRange } from "@/components/budget-picker";
import { CarGrid } from "@/components/car-cards";
import { Select } from "@/components/select";
import { SortSelect } from "@/components/sort-select";
import { getCars, getFilters, type Filters } from "@/lib/api";
import { gel, n } from "@/lib/format";

export const metadata: Metadata = { title: "ლიზინგით ხელმისაწვდომი მანქანები" };

const PAGE_SIZE = 12;
const KEYS = ["make", "body", "fuel", "price_min", "price_max", "year_min", "year_max", "monthly_max", "company", "seller", "sort", "page"];

type Params = Record<string, string | string[] | undefined>;

/** Keeps only known filters, in a stable order, so equal filters share a cache entry. */
function toQuery(sp: Params, overrides: Record<string, string | string[] | null> = {}) {
  const q = new URLSearchParams();
  for (const key of KEYS) {
    if (key in overrides) {
      for (const v of [overrides[key] ?? []].flat()) if (v) q.append(key, v);
      continue;
    }
    const value = sp[key];
    for (const v of [value ?? []].flat().sort()) if (v) q.append(key, v);
  }
  return q.toString();
}

export default function CarsPage({ searchParams }: PageProps<"/cars">) {
  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-14 pt-6 sm:px-8 sm:pt-8">
      <nav aria-label="breadcrumb" className="text-sm text-muted">
        <Link href="/" className="hover:text-brand">მთავარი</Link> / მანქანები
      </nav>
      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Catalog({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const query = toQuery(sp);
  const [data, filters] = await Promise.all([getCars(query), getFilters()]);
  const page = Number(sp.page) || 1;
  const pages = Math.max(1, Math.ceil(data.count / PAGE_SIZE));
  const chips = activeChips(sp, filters);
  const monthly = Number(sp.monthly_max) || 0;
  // "A bit more budget?" — how many more cars the next budget step would add.
  const more = monthly ? filters.monthly.filter((m) => m > monthly && m <= monthly * 1.5).length : 0;

  return (
    <>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[34px]">მანქანები ლიზინგით</h1>
          <p className="mt-1 text-muted">
            <b className="text-ink">{data.count} მანქანა</b>
            {monthly ? ` ეტევა ბიუჯეტში · თვეში ${gel(monthly)}-მდე` : " · ყველა კომპანიის შეთავაზებით"}
          </p>
        </div>
        <SortSelect value={String(sp.sort ?? "new")} />
      </div>
      {chips.length > 0 && (
        <ul aria-label="არჩეული ფილტრები" className="mt-4 flex flex-wrap gap-2">
          {chips.map((c) => (
            <li key={c.label}>
              <Link
                href={`/cars?${toQuery(sp, { ...c.remove, page: null })}`}
                aria-label={`${c.label} — მოხსნა`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-brand px-3.5 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                {c.label} <span aria-hidden="true">✕</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 grid items-start gap-7 lg:grid-cols-[300px_1fr]">
        <FilterPanel sp={sp} filters={filters} active={chips.length} />
        <section aria-label="მანქანები" className="min-w-0">
          {data.count === 0 ? (
            <div className="rounded-[18px] border border-line bg-white p-8 text-center">
              <b>ამ ფილტრით მანქანა ვერ მოიძებნა.</b>
              <div className="mt-2">
                <Link href="/cars" className="font-semibold text-brand">ფილტრის გასუფთავება</Link>
              </div>
            </div>
          ) : (
            <CarGrid cars={data.results} />
          )}
          {more > 0 && page === pages && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-brand-tint bg-brand-soft p-5">
              <div>
                <b className="text-[17px]">ცოტა მეტი ბიუჯეტით?</b>
                <div className="text-muted">{gel(Math.round(monthly * 1.5))}-მდე კიდევ {more} მანქანა გამოჩნდება.</div>
              </div>
              <Link
                href={`/cars?${toQuery(sp, { monthly_max: String(Math.round(monthly * 1.5)), page: null })}`}
                className="inline-flex min-h-11 items-center rounded-xl border-[1.5px] border-field bg-white px-4 font-semibold hover:border-brand hover:text-brand"
              >
                ბიუჯეტის გაზრდა
              </Link>
            </div>
          )}
          {pages > 1 && (
            <nav aria-label="გვერდები" className="flex flex-wrap justify-center gap-2 pt-7">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/cars?${toQuery(sp, { page: p === 1 ? null : String(p) })}`}
                  aria-current={p === page ? "page" : undefined}
                  className={`flex size-11 items-center justify-center rounded-full font-semibold ${
                    p === page ? "bg-brand text-white" : "border-[1.5px] border-line bg-white hover:border-brand hover:text-brand"
                  }`}
                >
                  {p}
                </Link>
              ))}
            </nav>
          )}
        </section>
      </div>
    </>
  );
}

/** The filters in use, each with the query change that removes it. */
function activeChips(sp: Params, filters: Filters) {
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const labelOf = (list: { value: string; label: string }[], v: string) => list.find((o) => o.value === v)?.label ?? v;
  const chips: { label: string; remove: Record<string, string | string[] | null> }[] = [];
  if (str("monthly_max")) chips.push({ label: `თვეში ${gel(Number(str("monthly_max")))}-მდე`, remove: { monthly_max: null } });
  if (str("make")) chips.push({ label: str("make"), remove: { make: null } });
  if (str("body")) chips.push({ label: labelOf(filters.bodies, str("body")), remove: { body: null } });
  const fuels = [sp.fuel ?? []].flat();
  for (const f of fuels) {
    chips.push({ label: labelOf(filters.fuels, f), remove: { fuel: fuels.filter((x) => x !== f) } });
  }
  if (str("price_min") || str("price_max")) {
    chips.push({ label: `ფასი ${[str("price_min") && `${n(+str("price_min"))}-დან`, str("price_max") && `${n(+str("price_max"))}-მდე`].filter(Boolean).join(" ")} ₾`, remove: { price_min: null, price_max: null } });
  }
  if (str("year_min") || str("year_max")) {
    chips.push({ label: `წელი ${[str("year_min"), str("year_max")].filter(Boolean).join("–")}`, remove: { year_min: null, year_max: null } });
  }
  if (str("company")) chips.push({ label: labelOf(filters.companies, str("company")), remove: { company: null } });
  return chips;
}

const field = "min-h-11 w-full rounded-xl border-[1.5px] border-field bg-white px-3 font-normal";

/** Desktop: a sidebar. Phones: a "filter" button that slides the same form up
 * from the bottom (a CSS-only toggle, so it works before JavaScript loads). */
function FilterPanel({ sp, filters, active }: { sp: Params; filters: Filters; active: number }) {
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const fuels = [sp.fuel ?? []].flat();
  return (
    <div className="lg:sticky lg:top-5">
      <input type="checkbox" id="filters-open" className="peer sr-only" />
      <label
        htmlFor="filters-open"
        className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border-[1.5px] border-field bg-white font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-brand lg:hidden"
      >
        ფილტრი
        {active > 0 && <span className="rounded-full bg-brand px-2 text-[12.5px] font-bold text-white">{active}</span>}
      </label>
      {/* Dimmed page behind the sheet on phones; tapping it closes the sheet. */}
      <label htmlFor="filters-open" aria-hidden="true" className="fixed inset-0 z-40 hidden bg-ink/50 max-lg:peer-checked:block" />
      <form
        action="/cars"
        aria-label="ფილტრი"
        className="flex flex-col gap-5 rounded-[18px] border border-line bg-white p-5 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-50 max-lg:hidden max-lg:max-h-[88vh] max-lg:overflow-y-auto max-lg:rounded-b-none max-lg:rounded-t-3xl max-lg:shadow-[0_-10px_40px_rgba(15,42,61,.25)] max-lg:peer-checked:flex"
      >
        <div className="flex items-center justify-between lg:hidden">
          <b className="text-xl">ფილტრი</b>
          <label htmlFor="filters-open" className="inline-flex min-h-11 cursor-pointer items-center px-2 font-semibold text-muted">დახურვა ✕</label>
        </div>
        {sp.sort && <input type="hidden" name="sort" value={str("sort")} />}
        <MonthlyRange defaultValue={str("monthly_max")} />
        <hr className="border-line" />
        <Select
          key={`make-${str("make")}`}
          label="მწარმოებელი"
          name="make"
          defaultValue={str("make")}
          options={[{ value: "", label: "ყველა" }, ...filters.makes.map((m) => ({ value: m, label: m }))]}
        />
        <fieldset>
          <legend className="mb-2 text-[13px] font-bold text-muted">ძარა</legend>
          <div className="flex flex-wrap gap-1.5">
            {[{ value: "", label: "ყველა" }, ...filters.bodies].map((b) => (
              <Chip key={b.value} type="radio" name="body" value={b.value} label={b.label} checked={str("body") === b.value} />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-[13px] font-bold text-muted">საწვავი</legend>
          <div className="flex flex-wrap gap-1.5">
            {filters.fuels.map((f) => (
              <Chip key={f.value} type="checkbox" name="fuel" value={f.value} label={f.label} checked={fuels.includes(f.value)} />
            ))}
          </div>
        </fieldset>
        {[
          { title: "ფასი, ₾", min: "price_min", max: "price_max" },
          { title: "წელი", min: "year_min", max: "year_max" },
        ].map((r) => (
          <fieldset key={r.title}>
            <legend className="mb-2 text-[13px] font-bold text-muted">{r.title}</legend>
            <div className="flex gap-2">
              <input name={r.min} defaultValue={str(r.min)} inputMode="numeric" placeholder="დან" aria-label={`${r.title} დან`} className={field} />
              <input name={r.max} defaultValue={str(r.max)} inputMode="numeric" placeholder="მდე" aria-label={`${r.title} მდე`} className={field} />
            </div>
          </fieldset>
        ))}
        <Select
          key={`company-${str("company")}`}
          label="ლიზინგ კომპანია"
          name="company"
          defaultValue={str("company")}
          options={[{ value: "", label: "ყველა" }, ...filters.companies]}
        />
        <div className="flex flex-col gap-2 max-lg:sticky max-lg:-bottom-5 max-lg:-mx-5 max-lg:-mb-5 max-lg:border-t max-lg:border-line max-lg:bg-white max-lg:p-4">
          <button className="min-h-[50px] rounded-xl bg-cta px-5 font-bold text-ink transition hover:bg-cta-dark">მანქანების ჩვენება</button>
          <Link href="/cars" className="inline-flex min-h-11 items-center justify-center text-sm font-semibold text-muted hover:text-brand">
            ფილტრის გასუფთავება
          </Link>
        </div>
      </form>
    </div>
  );
}

function Chip({ type, name, value, label, checked }: { type: "radio" | "checkbox"; name: string; value: string; label: string; checked: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type={type} name={name} value={value} defaultChecked={checked} className="peer sr-only" />
      <span className="inline-flex min-h-9 items-center rounded-full border-[1.5px] border-line bg-white px-3.5 text-sm font-semibold peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
        {label}
      </span>
    </label>
  );
}

function CatalogSkeleton() {
  return (
    <div aria-busy="true" className="mt-4 flex flex-col gap-5">
      <div className="h-10 w-80 animate-pulse rounded bg-line" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-[420px] animate-pulse rounded-[18px] bg-white" />
        ))}
      </div>
    </div>
  );
}
