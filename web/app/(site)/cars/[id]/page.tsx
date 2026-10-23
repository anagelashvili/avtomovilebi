import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCar, type Offer } from "@/lib/api";
import { gel, n } from "@/lib/format";
import { ApplyForm } from "./apply-form";
import { FORM_ID } from "./form-id";

export async function generateMetadata({ params }: PageProps<"/cars/[id]">): Promise<Metadata> {
  const car = await getCar((await params).id);
  if (!car) return { title: "მანქანა ვერ მოიძებნა" };
  const title = `${car.make} ${car.model} ${car.year}`;
  const description = `${gel(car.price_gel)} · ლიზინგით თვიურად ${gel(car.monthly_from)}-დან · ${car.city}`;
  return {
    title,
    description,
    // Shown when the link is shared (Facebook, Messenger, Viber…).
    openGraph: {
      title: `${title} · თვიურად ${gel(car.monthly_from)}-დან`,
      description,
      url: `/cars/${car.id}`,
      images: car.photos[0] ? [{ url: car.photos[0], alt: title }] : undefined,
    },
  };
}

export default function CarPage({ params }: PageProps<"/cars/[id]">) {
  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-28 pt-6 sm:px-8 lg:pb-14">
      <Suspense fallback={<div aria-busy="true" className="h-[600px] animate-pulse rounded-[22px] bg-white" />}>
        <CarView params={params} />
      </Suspense>
    </div>
  );
}

const STEPS = [
  { title: "აირჩიეთ შეთავაზება", text: "თვიური, შენატანი და ვადა." },
  { title: "შეავსეთ 4 ველი", text: "სახელი, გვარი, პირადი ნომერი, ტელეფონი." },
  { title: "მიიღეთ კოდი", text: "კოდით მიდიხართ კომპანიაში." },
];

async function CarView({ params }: { params: Promise<{ id: string }> }) {
  const car = await getCar((await params).id);
  if (!car) notFound();
  const name = `${car.make} ${car.model}`;
  const specs = [
    ["წელი", String(car.year)],
    ["გარბენი", car.mileage_km ? `${n(car.mileage_km)} კმ` : ""],
    ["ძარა", car.body_label],
    ["საწვავი", car.fuel_label],
    ["ძრავა", car.engine && `${car.engine}l`],
    ["კოლოფი", car.transmission_label],
    ["ქალაქი", car.city],
    ["ფასი", gel(car.price_gel)],
  ].filter(([, v]) => v);
  const best = car.offers[0]; // cheapest monthly first
  const lowestDown = car.offers.reduce<Offer | undefined>(
    (m, o) => (!m || o.down_payment_gel < m.down_payment_gel ? o : m),
    undefined,
  );

  return (
    <>
      <nav aria-label="breadcrumb" className="mb-4 text-sm text-muted">
        <Link href="/" className="hover:text-brand">მთავარი</Link> /{" "}
        <Link href="/cars" className="hover:text-brand">მანქანები</Link> /{" "}
        <Link href={`/cars?make=${encodeURIComponent(car.make)}`} className="hover:text-brand">{car.make}</Link>
      </nav>
      {/* Phones: photo, then price and offers, then the details. Desktop:
          the price column sits on the right, next to both. */}
      <div className="grid items-start gap-x-8 gap-y-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="relative aspect-[16/10] overflow-hidden rounded-[22px] bg-photo">
            {car.photos[0] && (
              <Image src={car.photos[0]} alt={name} fill priority quality={90} sizes="(max-width: 1024px) 100vw, 760px" className="object-cover" />
            )}
            {car.photo_credit && (
              <span className="absolute bottom-3 left-3 max-w-[90%] truncate rounded-full bg-ink/75 px-3 py-0.5 text-xs font-semibold text-white">
                ფოტო: {car.photo_credit}
              </span>
            )}
          </div>
          {car.photos.length > 1 && (
            <div className="grid grid-cols-5 gap-2.5">
              {car.photos.slice(1, 6).map((src, i) => (
                <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-photo">
                  <Image src={src} alt={`${name}, ფოტო ${i + 2}`} fill sizes="150px" className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5 max-lg:order-3 lg:col-start-1">
          <section aria-label="მახასიათებლები">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {specs.map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-line bg-white px-4 py-3">
                  <dt className="text-[13px] text-muted">{k}</dt>
                  <dd className="font-bold">{v}</dd>
                </div>
              ))}
            </dl>
            {car.description && <p className="mt-4 whitespace-pre-line">{car.description}</p>}
          </section>

          <section aria-labelledby="how" className="rounded-[18px] border border-line bg-white p-6">
            <h2 id="how" className="mb-4 text-[19px] font-bold">როგორ მუშაობს განაცხადი</h2>
            <ol className="grid gap-4 text-[14.5px] sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-2.5">
                  <span className="inline-flex size-7 flex-none items-center justify-center rounded-full bg-cta font-extrabold">{i + 1}</span>
                  <span>
                    <b>{s.title}</b>
                    <br />
                    <span className="text-muted">{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="rounded-[22px] bg-white p-6 shadow-[0_18px_44px_rgba(15,42,61,.10)] max-lg:order-2 lg:sticky lg:top-5 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight sm:text-[30px]">
            {name} {car.year}
          </h1>
          <div className="mt-1 text-muted">
            ფასი <b className="text-ink">{gel(car.price_gel)}</b>
            {car.mileage_km ? ` · ${n(car.mileage_km)} კმ` : ""} · {car.city}
          </div>
          {best && (
            <>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-[44px] font-extrabold leading-none tracking-tight text-brand">{gel(best.monthly_gel)}</span>
                <span className="text-muted">/ თვეში</span>
              </div>
              <div className="mt-1.5 text-sm text-muted">
                {best.company} · შენატანი {gel(best.down_payment_gel)} · {best.term_months} თვე
              </div>
            </>
          )}

          <fieldset className="mt-6">
            <legend className="mb-2.5 text-[13px] font-bold text-muted">
              {car.offers.length === 1 ? "ლიზინგის შეთავაზება" : `${car.offers.length} კომპანიის შეთავაზება`}
            </legend>
            <div className="flex flex-col gap-2.5">
              {car.offers.map((o, i) => (
                <label key={o.id} className="block cursor-pointer">
                  <input type="radio" name="offer" value={o.id} form={FORM_ID} defaultChecked={i === 0} className="peer sr-only" />
                  <span className="block rounded-2xl border-[1.5px] border-line bg-white px-4 py-3.5 transition peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:shadow-[inset_0_0_0_1px_var(--color-brand)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand peer-checked:[&_.dot]:border-[6px] peer-checked:[&_.dot]:border-brand">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-2.5">
                        <span className="dot size-5 flex-none rounded-full border-2 border-[#aab6c6] bg-white" />
                        <b>{o.company}</b>
                      </span>
                      {car.offers.length > 1 && o === best && <Tag tone="ok">ყველაზე დაბალი თვიური</Tag>}
                      {car.offers.length > 1 && o !== best && o === lowestDown && <Tag tone="blue">ნაკლები შენატანი</Tag>}
                    </span>
                    <span className="mt-2.5 grid grid-cols-3 gap-2 pl-[30px]">
                      <Figure label="თვეში" value={gel(o.monthly_gel)} strong />
                      <Figure label="შენატანი" value={gel(o.down_payment_gel)} />
                      <Figure label="ვადა" value={`${o.term_months} თვე`} />
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <a
            href="#apply"
            className="mt-5 flex min-h-[52px] items-center justify-center rounded-xl bg-cta px-5 text-[17px] font-bold text-ink transition hover:-translate-y-px hover:bg-cta-dark max-lg:hidden"
          >
            განაცხადის გაგზავნა →
          </a>
          <p className="mt-3 flex gap-2 text-[13.5px] text-muted">
            <span aria-hidden="true">🔒</span>
            უფასოა. კომპანია ხედავს მხოლოდ თქვენს სახელს, სანამ კოდს არ მიუტანთ.
          </p>
          <p className="mt-1.5 text-[12.5px] text-muted">თანხები სავარაუდოა — საბოლოო პირობებს კომპანია გეტყვით.</p>
        </aside>
      </div>

      <section id="apply" aria-label="განაცხადი" className="mt-8 scroll-mt-5">
        <ApplyForm carId={car.id} carName={`${name} ${car.year}`} />
      </section>

      {/* Phones: the price and the apply button stay on screen. */}
      {best && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-white px-4 pb-4 pt-3 shadow-[0_-8px_24px_rgba(15,42,61,.10)] lg:hidden">
          <div className="leading-tight">
            <b className="text-[22px] font-extrabold text-brand">{gel(best.monthly_gel)}</b>
            <span className="text-[13px] text-muted"> / თვე</span>
            <div className="max-w-[150px] truncate text-[12.5px] text-muted">
              {best.company} · {best.term_months} თვე
            </div>
          </div>
          <a href="#apply" className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-cta px-4 font-bold text-ink">
            განაცხადი →
          </a>
        </div>
      )}
    </>
  );
}

function Tag({ tone, children }: { tone: "ok" | "blue"; children: React.ReactNode }) {
  const cls = tone === "ok" ? "bg-ok-soft text-ok" : "bg-brand-soft text-brand";
  return <span className={`rounded-full px-2.5 py-0.5 text-[12.5px] font-bold ${cls}`}>{children}</span>;
}

function Figure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <span>
      <span className="block text-[12.5px] text-muted">{label}</span>
      <b className={strong ? "text-[21px] font-extrabold text-brand" : "text-base"}>{value}</b>
    </span>
  );
}
