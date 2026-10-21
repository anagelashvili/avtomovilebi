import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCar } from "@/lib/api";
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
    <div className="mx-auto max-w-[1240px] px-6 pb-14 pt-7">
      <Suspense fallback={<div aria-busy="true" className="h-[600px] animate-pulse rounded-lg bg-white" />}>
        <CarView params={params} />
      </Suspense>
    </div>
  );
}

async function CarView({ params }: { params: Promise<{ id: string }> }) {
  const car = await getCar((await params).id);
  if (!car) notFound();
  const name = `${car.make} ${car.model}`;
  const specs = [
    ["წელი", String(car.year)],
    ["ძარის ტიპი", car.body_label],
    ["საწვავი", car.fuel_label],
    ["ძრავა", car.engine && `${car.engine}l`],
    ["გადაცემათა კოლოფი", car.transmission_label],
    ["გარბენი", car.mileage_km ? `${n(car.mileage_km)} კმ` : ""],
    ["ქალაქი", car.city],
  ].filter(([, v]) => v);

  return (
    <>
      <nav aria-label="breadcrumb" className="mb-3 text-muted">
        <Link href="/" className="hover:text-brand">მთავარი</Link> /{" "}
        <Link href="/cars" className="hover:text-brand">მანქანები</Link> / {name}
      </nav>
      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex min-w-0 flex-col gap-3.5">
          <div className="relative h-[260px] overflow-hidden rounded-lg border border-line bg-[#ece6f6] sm:h-[430px]">
            {car.photos[0] && <Image src={car.photos[0]} alt={name} fill priority quality={90} sizes="(max-width: 1024px) 100vw, 720px" className="object-cover" />}
            {car.photo_credit && (
              <span className="absolute bottom-0 right-0 max-w-full truncate rounded-tl-md bg-ink/60 px-2 py-0.5 text-[11px] text-white">
                ფოტო: {car.photo_credit}
              </span>
            )}
          </div>
          {car.photos.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {car.photos.slice(1, 6).map((src, i) => (
                <div key={src} className="relative h-[70px] overflow-hidden rounded-lg border border-line">
                  <Image src={src} alt={`${name}, ფოტო ${i + 2}`} fill sizes="140px" className="object-cover" />
                </div>
              ))}
            </div>
          )}

          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="text-[17px] font-bold">მახასიათებლები</h2>
            <dl className="mt-2">
              {specs.map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-brand-soft py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-bold">{v}</dd>
                </div>
              ))}
            </dl>
            {car.description && <p className="mt-4 whitespace-pre-line">{car.description}</p>}
          </section>

          <section className="overflow-x-auto rounded-lg border border-line bg-white p-5">
            <h2 className="text-[17px] font-bold">ლიზინგის შეთავაზებები</h2>
            <fieldset className="mt-2.5">
              <legend className="sr-only">აირჩიეთ შეთავაზება</legend>
              <table className="w-full min-w-[520px] border-collapse text-left">
                <thead>
                  <tr className="text-[13px] text-muted">
                    <th className="p-2 font-normal">კომპანია</th>
                    <th className="font-normal">ვადა</th>
                    <th className="font-normal">შენატანი</th>
                    <th className="font-normal">თვიური</th>
                    <th><span className="sr-only">არჩევა</span></th>
                  </tr>
                </thead>
                <tbody>
                  {car.offers.map((o, i) => (
                    <tr key={o.id} className="border-t border-brand-soft">
                      <td className="px-2 py-3 font-bold">{o.company}</td>
                      <td>{o.term_months} თვე</td>
                      <td>{gel(o.down_payment_gel)}</td>
                      <td className="font-bold">{gel(o.monthly_gel)}</td>
                      <td>
                        <label className="cursor-pointer">
                          <input type="radio" name="offer" value={o.id} form={FORM_ID} defaultChecked={i === 0} className="peer sr-only" />
                          <span className="inline-flex min-h-11 items-center rounded-md border-[1.5px] border-brand px-3.5 font-semibold text-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
                            არჩევა
                          </span>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </fieldset>
          </section>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-4">
          <div className="rounded-lg border border-line bg-white p-5">
            <h1 className="text-[26px] font-bold">{name}</h1>
            <div className="mb-3 mt-1 text-muted">{car.year} · {car.fuel_label} · {car.city}</div>
            <div className="text-[30px] font-bold">{gel(car.price_gel)}</div>
            <div className="mt-2.5 rounded-md bg-sun-soft p-2.5">
              თვიურად <b>{gel(car.monthly_from)}</b>-დან
            </div>
          </div>
          <ApplyForm carId={car.id} />
        </div>
      </div>
    </>
  );
}
