import Image from "next/image";
import Link from "next/link";
import { BudgetPicker } from "@/components/budget-picker";
import { CarGrid } from "@/components/car-cards";
import { CompanyAvatar } from "@/components/company-card";
import { getCars, getCompanies, getFilters, type CarCard } from "@/lib/api";
import { gel } from "@/lib/format";

/** The budget the home page opens with (₾ a month). */
const BUDGET = 800;
const QUICK_BUDGETS = [500, 800, 1200, 2000];

const TRUST = [
  { title: "უფასოა მყიდველისთვის", text: "საკომისიოს კომპანია იხდის, არა თქვენ." },
  { title: "მონაცემები დაცულია", text: "კომპანია თქვენს მონაცემებს ხედავს მხოლოდ თქვენი კოდით." },
  { title: "ერთი განაცხადი — ერთ წუთში", text: "არც რეგისტრაცია, არც ზარების ლოდინი." },
];
const STEPS = [
  { title: "აირჩიეთ მანქანა", text: "შეადარეთ კომპანიების შეთავაზებები: თვიური, შენატანი, ვადა." },
  { title: "გაგზავნეთ განაცხადი", text: "ერთ წუთში. მიიღებთ პირად კოდს SMS-ით და მეილზე." },
  { title: "მიდით კომპანიაში", text: "კოდს უჩვენებთ — მხოლოდ მაშინ ხედავს კომპანია თქვენს მონაცემებს." },
];

export default async function Home() {
  const [{ results: fits }, { results: priciest }, filters, companies] = await Promise.all([
    getCars(`monthly_max=${BUDGET}&sort=monthly`),
    getCars(`monthly_max=${BUDGET}&sort=price_desc`),
    getFilters(),
    getCompanies(),
  ]);
  const leasing = companies.filter((c) => c.is_leasing);
  // The hero shows the priciest car that still fits the opening budget.
  const featured = priciest.find((c) => c.photo);

  return (
    <>
      <section className="bg-[linear-gradient(180deg,#fff_0%,var(--color-page)_100%)]">
        <div className="mx-auto grid max-w-[1280px] items-center gap-12 px-4 pb-14 pt-10 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-[72px] lg:pt-16">
          <div>
            <span className="inline-block rounded-full bg-brand-soft px-3.5 py-1 text-[13.5px] font-bold text-brand">
              {leasing.length} ლიზინგ კომპანია · {filters.monthly.length} მანქანა
            </span>
            <h1 className="mt-4 text-[34px] font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-[54px]">
              რამდენის გადახდა <br className="max-sm:hidden" />შეგიძლიათ <span className="text-brand">თვეში?</span>
            </h1>
            <p className="mb-7 mt-4 max-w-[520px] text-lg text-muted">
              აირჩიეთ ბიუჯეტი — ვაჩვენებთ მანქანებს, რომლებიც მასში ეტევა, და ყველა კომპანიის შეთავაზებას გვერდიგვერდ.
            </p>
            <BudgetPicker monthly={filters.monthly} initial={BUDGET} />
          </div>
          {featured && <FeaturedCar car={featured} />}
        </div>
        <ul className="mx-auto grid max-w-[1280px] gap-5 px-4 pb-4 sm:px-8 md:grid-cols-3">
          {TRUST.map((t) => (
            <li key={t.title} className="flex gap-3">
              <Check />
              <div>
                <b>{t.title}</b>
                <div className="text-sm text-muted">{t.text}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mx-auto max-w-[1280px] px-4 sm:px-8">
        {leasing.length > 0 && (
          <section aria-labelledby="partners" className="pt-14">
            <h2 id="partners" className="mb-4 text-center text-[13px] font-bold text-muted">შეთავაზებები ამ კომპანიებისგან</h2>
            <ul className="flex flex-wrap justify-center gap-2.5">
              {leasing.map((c) => (
                <li key={c.code}>
                  <Link
                    href={`/companies/${c.code}`}
                    className="flex min-h-11 items-center gap-2.5 rounded-xl border border-line bg-white py-1.5 pl-1.5 pr-4 font-bold text-[#41566a] transition hover:border-brand hover:text-brand"
                  >
                    <CompanyAvatar company={c} size={32} />
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="fits" className="pt-16">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="fits" className="text-[28px] font-extrabold tracking-tight sm:text-3xl">თქვენს ბიუჯეტში</h2>
              <p className="mt-1 text-muted">ყოველთვიური გადასახადი {gel(BUDGET)}-მდე · ყველაზე იაფიდან</p>
            </div>
            <Link href="/cars" className="font-bold text-brand">ყველა მანქანა →</Link>
          </div>
          <nav aria-label="ბიუჯეტი" className="mb-5 flex flex-wrap gap-2">
            {QUICK_BUDGETS.map((b) => (
              <Link
                key={b}
                href={`/cars?monthly_max=${b}&sort=monthly`}
                className={`inline-flex min-h-10 items-center rounded-full border-[1.5px] px-4 text-sm font-semibold ${
                  b === BUDGET ? "border-brand bg-brand text-white" : "border-line bg-white hover:border-brand hover:text-brand"
                }`}
              >
                {gel(b)}-მდე
              </Link>
            ))}
          </nav>
          {fits.length ? <CarGrid cars={fits.slice(0, 4)} /> : <p className="text-muted">ამ ბიუჯეტით მანქანა ჯერ არ არის.</p>}
        </section>

        <section id="how" aria-labelledby="how-title" className="scroll-mt-4 py-[72px]">
          <div className="grid items-center gap-10 rounded-3xl bg-ink p-7 text-white sm:p-12 lg:grid-cols-[1fr_1.6fr] lg:gap-12">
            <div>
              <h2 id="how-title" className="text-[28px] font-extrabold sm:text-3xl">როგორ მუშაობს</h2>
              <p className="mb-6 mt-3 text-footer-text">
                თქვენი პირადი ნომერი და ტელეფონი დაშიფრულია. კომპანია მათ ვერ ნახავს, სანამ თავად არ მიუტანთ კოდს.
              </p>
              <div className="inline-flex items-center gap-3 rounded-2xl bg-[#163a55] px-5 py-3.5">
                <span className="text-[13px] text-footer-text">თქვენი კოდი</span>
                <b className="text-[26px] tracking-[.12em] text-[#ffb27d]">GL-48213</b>
              </div>
            </div>
            <ol className="grid gap-4 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="rounded-[18px] bg-[#163a55] p-5">
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-cta font-extrabold text-ink">{i + 1}</span>
                  <b className="mb-1.5 mt-3.5 block text-[17px]">{s.title}</b>
                  <span className="text-[14.5px] text-footer-text">{s.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </>
  );
}

function Check() {
  return (
    <span aria-hidden="true" className="inline-flex size-[30px] flex-none items-center justify-center rounded-full bg-ok-soft text-ok">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12.5l5 5L20 6.5" />
      </svg>
    </span>
  );
}

function FeaturedCar({ car }: { car: CarCard }) {
  const best = car.offers[0];
  return (
    <Link href={`/cars/${car.id}`} className="group relative block max-lg:mx-auto max-lg:w-full max-lg:max-w-[620px]">
      <div className="relative aspect-[5/4] overflow-hidden rounded-[28px] bg-photo shadow-[0_30px_60px_rgba(15,42,61,.18)]">
        <Image
          src={car.photo!}
          alt=""
          fill
          priority
          quality={90}
          sizes="(max-width: 1024px) 100vw, 620px"
          className="object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.03]"
        />
      </div>
      <div className="absolute bottom-6 left-4 min-w-[260px] rounded-[18px] bg-white px-5 py-4 shadow-[0_16px_40px_rgba(15,42,61,.18)] lg:-left-9 lg:bottom-9">
        <div className="font-bold">{car.make} {car.model} {car.year}</div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[30px] font-extrabold tracking-tight text-brand">{gel(car.monthly_from)}</span>
          <span className="text-muted">/ თვეში</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-ok-soft px-2.5 py-0.5 text-[12.5px] font-bold text-ok">✓ ბიუჯეტში ეტევა</span>
          {best && <span className="text-[13px] text-muted">{best.company} · {best.term_months} თვე</span>}
        </div>
      </div>
    </Link>
  );
}
