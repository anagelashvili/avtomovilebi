import Image from "next/image";
import Link from "next/link";
import type { Company } from "@/lib/api";

// The company's logo when it has one; otherwise a coloured initial, the
// colour picked from the company code so each company keeps the same one.
const COLORS = ["#6a1bd1", "#1e1b2e", "#f5b800", "#4b2a86", "#17653a", "#1a3f8a"];

function initial(name: string) {
  const first = name.replace(/^შპს\s+/, "").trim().charAt(0);
  // Only Latin letters get capitalised; Georgian capitals (Mtavruli) look odd here.
  return /[a-z]/.test(first) ? first.toUpperCase() : first;
}

export function CompanyAvatar({ company, size = 48 }: { company: Company; size?: number }) {
  if (company.logo) {
    return (
      <span
        className="relative inline-flex flex-none overflow-hidden rounded-xl border border-line bg-white"
        style={{ width: size, height: size }}
      >
        <Image src={company.logo} alt="" fill sizes={`${size * 2}px`} className="object-contain p-1" />
      </span>
    );
  }
  const sum = [...company.code].reduce((s, c) => s + c.charCodeAt(0), 0);
  const bg = COLORS[sum % COLORS.length];
  return (
    <span
      aria-hidden="true"
      className="inline-flex flex-none items-center justify-center rounded-xl font-extrabold"
      style={{ width: size, height: size, fontSize: size * 0.45, background: bg, color: bg === "#f5b800" ? "#1e1b2e" : "#fff" }}
    >
      {initial(company.name)}
    </span>
  );
}

export function cars(n: number) {
  return `${n} მანქანა`;
}

/** Partner card: links to the company's own page with its cars. */
export function CompanyCard({ company }: { company: Company }) {
  return (
    <Link
      href={`/companies/${company.code}`}
      className="group flex items-center gap-3.5 rounded-lg border border-line bg-white p-4 transition-shadow hover:shadow-[0_6px_18px_rgba(30,27,46,.12)]"
    >
      <CompanyAvatar company={company} />
      <span className="flex min-w-0 flex-col">
        <b className="truncate group-hover:text-brand">{company.name}</b>
        <span className="text-sm text-muted">
          {company.cars_count ? cars(company.cars_count) : "ლიზინგის შეთავაზებები"}
        </span>
      </span>
    </Link>
  );
}
