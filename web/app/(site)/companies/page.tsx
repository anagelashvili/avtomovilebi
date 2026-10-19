import type { Metadata } from "next";
import Link from "next/link";
import { TextPage } from "@/components/text-page";
import { getFilters } from "@/lib/api";

export const metadata: Metadata = { title: "ლიზინგ კომპანიები" };

export default async function CompaniesPage() {
  const { companies } = await getFilters();
  return (
    <TextPage title="ლიზინგ კომპანიები">
      <p>ჩვენს საიტზე შეთავაზებებს ეს კომპანიები აქვეყნებენ. აირჩიეთ კომპანია და ნახეთ მისი შეთავაზებით ხელმისაწვდომი მანქანები.</p>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        {companies.map((c) => (
          <li key={c.value}>
            <Link href={`/cars?company=${c.value}`} className="block rounded-lg border border-line p-5 text-center font-semibold hover:border-brand hover:text-brand">
              {c.label}
            </Link>
          </li>
        ))}
      </ul>
      {companies.length === 0 && <p className="text-muted">კომპანიები მალე დაემატება.</p>}
    </TextPage>
  );
}
