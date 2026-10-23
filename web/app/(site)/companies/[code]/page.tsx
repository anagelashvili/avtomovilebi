import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CarGrid } from "@/components/car-cards";
import { CompanyAvatar, cars as carsLabel } from "@/components/company-card";
import { getCars, getCompany } from "@/lib/api";

export async function generateMetadata({ params }: PageProps<"/companies/[code]">): Promise<Metadata> {
  const company = await getCompany((await params).code);
  return company
    ? { title: company.name, description: `${company.name} — მანქანები და ლიზინგის შეთავაზებები.` }
    : { title: "კომპანია ვერ მოიძებნა" };
}

export default function CompanyPage({ params }: PageProps<"/companies/[code]">) {
  return (
    <div className="mx-auto max-w-[1240px] px-6 pb-14 pt-6">
      <Suspense fallback={<div aria-busy="true" className="h-[400px] animate-pulse rounded-lg bg-white" />}>
        <CompanyView params={params} />
      </Suspense>
    </div>
  );
}

// Contact fields still hold "[…]" placeholders until the companies send theirs.
const known = (v: string) => v && !v.startsWith("[");

async function CompanyView({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const company = await getCompany(code);
  if (!company) notFound();
  const { results, count } = await getCars(`seller=${code}&sort=new`);

  const facts = [
    company.cars_count ? carsLabel(company.cars_count) : "",
    company.offers_count ? `${company.offers_count} ლიზინგის შეთავაზება` : "",
    known(company.address) ? company.address : "",
    known(company.phone) ? company.phone : "",
  ].filter(Boolean);

  return (
    <>
      <nav aria-label="breadcrumb" className="mb-3 text-muted">
        <Link href="/" className="hover:text-brand">მთავარი</Link> /{" "}
        <Link href="/companies" className="hover:text-brand">ლიზინგ კომპანიები</Link> / {company.name}
      </nav>

      <section className="mb-6 flex flex-wrap items-center gap-5 rounded-lg border border-line bg-white p-6">
        <CompanyAvatar company={company} size={72} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h1 className="text-[28px] font-bold leading-tight">{company.name}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted">
            {facts.map((f) => <span key={f}>{f}</span>)}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {company.is_leasing && <span className="rounded bg-sun-soft px-2 py-0.5 text-xs font-bold text-sun-ink">ლიზინგი</span>}
            {company.is_dealer && <span className="rounded bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-dark">მანქანების გაყიდვა</span>}
          </div>
        </div>
        {company.offers_count > 0 && (
          <Link
            href={`/cars?company=${company.code}`}
            className="inline-flex min-h-11 items-center rounded-md border-[1.5px] border-brand px-[18px] font-semibold text-brand hover:bg-brand-soft"
          >
            ყველა მანქანა მისი ლიზინგით →
          </Link>
        )}
      </section>

      <h2 className="mb-3 text-xl font-bold">{company.name}-ის მანქანები</h2>
      {results.length ? (
        <div className="flex flex-col gap-5">
          <CarGrid cars={results} />
          {count > results.length && (
            <Link href={`/cars?seller=${company.code}`} className="text-center font-semibold text-brand">
              ყველა {count} მანქანის ნახვა →
            </Link>
          )}
        </div>
      ) : (
        <p className="rounded-lg border border-line bg-white p-6 text-muted">ამ კომპანიას ჯერ მანქანები არ აქვს განთავსებული.</p>
      )}
    </>
  );
}
