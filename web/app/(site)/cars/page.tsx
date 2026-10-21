import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CarRow } from "@/components/car-cards";
import { Select } from "@/components/select";
import { SortSelect } from "@/components/sort-select";
import { getCars, getFilters, type Filters } from "@/lib/api";

export const metadata: Metadata = { title: "ლიზინგით ხელმისაწვდომი მანქანები" };

const PAGE_SIZE = 12;
const KEYS = ["make", "body", "fuel", "price_min", "price_max", "year_min", "year_max", "monthly_max", "company", "sort", "page"];

type Params = Record<string, string | string[] | undefined>;

/** Keeps only known filters, in a stable order, so equal filters share a cache entry. */
function toQuery(sp: Params, overrides: Record<string, string | null> = {}) {
  const q = new URLSearchParams();
  for (const key of KEYS) {
    if (key in overrides) {
      if (overrides[key]) q.append(key, overrides[key]!);
      continue;
    }
    const value = sp[key];
    for (const v of [value ?? []].flat().sort()) if (v) q.append(key, v);
  }
  return q.toString();
}

export default function CarsPage({ searchParams }: PageProps<"/cars">) {
  return (
    <div className="mx-auto max-w-[1240px] px-6 pb-14 pt-6">
      <nav aria-label="breadcrumb" className="mb-2 text-muted">
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

  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-bold">ლიზინგით ხელმისაწვდომი მანქანები</h1>
        <SortSelect value={String(sp.sort ?? "new")} />
      </div>
      <div className="flex flex-wrap items-start gap-6">
        <FilterForm sp={sp} filters={filters} />
        <section aria-label="მანქანები" className="flex min-w-0 flex-[999_1_560px] flex-col gap-3.5">
          <p className="text-muted">ნაპოვნია {data.count} მანქანა</p>
          {data.results.map((car) => <CarRow key={car.id} car={car} />)}
          {data.count === 0 && (
            <div className="rounded-lg border border-line bg-white p-8 text-center">
              <b>ამ ფილტრით მანქანა ვერ მოიძებნა.</b>
              <div className="mt-2">
                <Link href="/cars" className="font-semibold text-brand">ფილტრის გასუფთავება</Link>
              </div>
            </div>
          )}
          {pages > 1 && (
            <nav aria-label="გვერდები" className="flex flex-wrap justify-center gap-2 pt-2">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/cars?${toQuery(sp, { page: p === 1 ? null : String(p) })}`}
                  aria-current={p === page ? "page" : undefined}
                  className={`flex size-11 items-center justify-center rounded-md font-semibold ${
                    p === page ? "bg-brand text-white" : "border border-line bg-white hover:text-brand"
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

const field = "min-h-11 w-full rounded-md border border-field bg-white px-3 font-normal";
const label = "flex flex-col gap-1.5 font-bold";

function FilterForm({ sp, filters }: { sp: Params; filters: Filters }) {
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const fuels = [sp.fuel ?? []].flat();
  return (
    <form action="/cars" aria-label="ფილტრი" className="flex flex-[1_1_260px] flex-col gap-4 rounded-lg border border-line bg-white p-[18px] sm:max-w-[300px]">
      <b className="text-[17px]">ფილტრი</b>
      {sp.sort && <input type="hidden" name="sort" value={str("sort")} />}
      <Select
        key={`make-${str("make")}`}
        label="მარკა"
        name="make"
        defaultValue={str("make")}
        options={[{ value: "", label: "ყველა მარკა" }, ...filters.makes.map((m) => ({ value: m, label: m }))]}
      />
      <Select
        key={`body-${str("body")}`}
        label="ძარის ტიპი"
        name="body"
        defaultValue={str("body")}
        options={[{ value: "", label: "ყველა" }, ...filters.bodies]}
      />
      {[
        { title: "ფასი, ლ", min: "price_min", max: "price_max" },
        { title: "წელი", min: "year_min", max: "year_max" },
      ].map((r) => (
        <fieldset key={r.title} className="flex flex-col gap-1.5">
          <legend className="mb-1.5 font-bold">{r.title}</legend>
          <div className="flex gap-2">
            <input name={r.min} defaultValue={str(r.min)} inputMode="numeric" placeholder="დან" aria-label={`${r.title} დან`} className={field} />
            <input name={r.max} defaultValue={str(r.max)} inputMode="numeric" placeholder="მდე" aria-label={`${r.title} მდე`} className={field} />
          </div>
        </fieldset>
      ))}
      <fieldset>
        <legend className="mb-2 font-bold">საწვავი</legend>
        <div className="flex flex-wrap gap-1.5">
          {filters.fuels.map((f) => (
            <label key={f.value} className="cursor-pointer">
              <input type="checkbox" name="fuel" value={f.value} defaultChecked={fuels.includes(f.value)} className="peer sr-only" />
              <span className="inline-block rounded bg-brand-soft px-2.5 py-1 text-[13px] font-semibold text-brand-dark peer-checked:bg-brand peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-brand">
                {f.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className={label}>
        თვიური გადასახდელი, ლ
        <input name="monthly_max" defaultValue={str("monthly_max")} inputMode="numeric" placeholder="მდე" className={field} />
      </label>
      <Select
        key={`company-${str("company")}`}
        label="ლიზინგ კომპანია"
        name="company"
        defaultValue={str("company")}
        options={[{ value: "", label: "ყველა" }, ...filters.companies]}
      />
      <button className="min-h-11 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">გაფილტვრა</button>
      <Link href="/cars" className="text-center text-sm font-semibold text-brand">გასუფთავება</Link>
    </form>
  );
}

function CatalogSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-3.5">
      <div className="h-9 w-80 animate-pulse rounded bg-line" />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-[190px] animate-pulse rounded-lg bg-white" />
      ))}
    </div>
  );
}
