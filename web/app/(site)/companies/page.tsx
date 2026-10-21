import type { Metadata } from "next";
import Link from "next/link";
import { CompanyCard } from "@/components/company-card";
import { getCompanies } from "@/lib/api";

export const metadata: Metadata = { title: "ლიზინგ კომპანიები" };

export default async function CompaniesPage() {
  const companies = await getCompanies();
  return (
    <div className="mx-auto max-w-[1240px] px-6 pb-14 pt-6">
      <nav aria-label="breadcrumb" className="mb-2 text-muted">
        <Link href="/" className="hover:text-brand">მთავარი</Link> / ლიზინგ კომპანიები
      </nav>
      <h1 className="mb-2 text-[28px] font-bold">ლიზინგ კომპანიები</h1>
      <p className="mb-6 text-muted">აირჩიეთ კომპანია და ნახეთ მისი მანქანები და შეთავაზებები.</p>
      {companies.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5">
          {companies.map((c) => <CompanyCard key={c.code} company={c} />)}
        </div>
      ) : (
        <p className="text-muted">კომპანიები მალე დაემატება.</p>
      )}
    </div>
  );
}
