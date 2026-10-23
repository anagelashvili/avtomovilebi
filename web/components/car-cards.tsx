import Image from "next/image";
import Link from "next/link";
import type { CarCard as Car } from "@/lib/api";
import { gel, n } from "@/lib/format";

// The photo grows inside its frame when the card (a `group`) is hovered or
// focused; skipped for people who ask their system for less motion.
export const photoZoom =
  "object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-105 motion-safe:group-focus-within:scale-105";

function meta(car: Car) {
  return [car.mileage_km ? `${n(car.mileage_km)} კმ` : "", car.fuel_label, car.city].filter(Boolean).join(" · ");
}

/** Catalog and home card: the monthly payment is the big number, with every
 * company's offer underneath (cheapest first). */
export function CarCard({ car, sizes = "(max-width: 640px) 100vw, 400px" }: { car: Car; sizes?: string }) {
  const best = car.offers[0];
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[18px] border border-line bg-white transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(15,42,61,.12)] focus-within:shadow-[0_14px_34px_rgba(15,42,61,.12)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-photo">
        {car.photo && <Image src={car.photo} alt="" fill sizes={sizes} className={photoZoom} />}
        {car.offers.length > 1 && (
          <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-0.5 text-[12.5px] font-bold">
            {car.offers.length} შეთავაზება
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4 pt-3.5">
        <h3 className="text-[17px] font-bold">
          {/* The whole card is clickable through this link's ::after. */}
          <Link href={`/cars/${car.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {car.make} {car.model} <span className="font-semibold text-muted">{car.year}</span>
          </Link>
        </h3>
        <div className="text-[13.5px] text-muted">{meta(car)}</div>
        <div className="mt-2.5 flex items-baseline gap-1.5">
          <span className="text-[28px] font-extrabold leading-tight tracking-tight text-brand">{gel(car.monthly_from)}</span>
          <span className="text-sm text-muted">/ თვეში-დან</span>
        </div>
        <div className="text-[13.5px] text-muted">
          ფასი {gel(car.price_gel)}
          {best ? ` · შენატანი ${gel(best.down_payment_gel)}` : ""}
        </div>
        {car.offers.length > 0 && (
          <ul className="mt-2.5 rounded-xl bg-page px-3 py-1">
            {car.offers.map((o) => (
              <li key={o.id} className="flex justify-between gap-2 border-t border-dashed border-line py-1.5 text-[13.5px] first:border-0">
                <span className="truncate">{o.company}</span>
                <b className="whitespace-nowrap">
                  {gel(o.monthly_gel)} <span className="font-normal text-muted">· {o.term_months} თვე</span>
                </b>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export function CarGrid({ cars, className = "" }: { cars: Car[]; className?: string }) {
  return (
    <div className={`grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5 ${className}`}>
      {cars.map((car) => <CarCard key={car.id} car={car} />)}
    </div>
  );
}
