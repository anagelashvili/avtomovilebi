import Image from "next/image";
import Link from "next/link";
import type { CarCard } from "@/lib/api";
import { gel, n } from "@/lib/format";

function specs(car: CarCard) {
  return [car.year, car.fuel_label, car.engine && `${car.engine}l`, car.transmission_label]
    .filter(Boolean)
    .join(" · ");
}

// The photo grows inside its frame when the card (a `group`) is hovered or
// focused; skipped for people who ask their system for less motion.
export const photoZoom =
  "object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-110 motion-safe:group-focus-within:scale-110";

function Photo({ car, sizes, className }: { car: CarCard; sizes: string; className: string }) {
  return (
    <div className={`relative overflow-hidden bg-[#ece6f6] ${className}`}>
      {car.photo && (
        <Image src={car.photo} alt={`${car.make} ${car.model}`} fill sizes={sizes} className={photoZoom} />
      )}
    </div>
  );
}

/** Catalog row: photo · details · price column. */
export function CarRow({ car }: { car: CarCard }) {
  return (
    <article className="group flex flex-wrap overflow-hidden rounded-lg border border-line bg-white transition-shadow hover:shadow-[0_6px_18px_rgba(30,27,46,.12)]">
      <Photo car={car} sizes="280px" className="h-[190px] w-full sm:w-[280px] sm:flex-none" />
      <div className="flex min-w-[240px] flex-1 flex-col gap-1.5 p-4">
        <Link href={`/cars/${car.id}`} className="text-lg font-bold hover:text-brand">
          {car.make} {car.model}
        </Link>
        <span className="text-muted">{specs(car)}</span>
        <span className="text-muted">
          {car.mileage_km ? `${n(car.mileage_km)} კმ · ` : ""}{car.city}
        </span>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
          {car.companies.map((c) => (
            <span key={c} className="rounded bg-sun-soft px-2 py-0.5 text-xs font-bold text-sun-ink">
              {c}
            </span>
          ))}
          <span className="rounded bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-dark">ლიზინგით</span>
        </div>
      </div>
      <div className="flex w-full flex-col justify-center gap-1.5 border-t border-line p-4 sm:w-[210px] sm:border-l sm:border-t-0">
        <div className="text-[22px] font-bold">{gel(car.price_gel)}</div>
        <div className="text-sm">
          თვიურად <b>{gel(car.monthly_from)}</b>-დან
        </div>
        <Link
          href={`/cars/${car.id}`}
          className="mt-2 flex min-h-11 items-center justify-center rounded-md bg-brand px-4 font-bold text-white hover:bg-brand-dark"
        >
          შეთავაზებები
        </Link>
      </div>
    </article>
  );
}

/** Home page tile. */
export function CarTile({ car }: { car: CarCard }) {
  return (
    <Link
      href={`/cars/${car.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-line bg-white transition-shadow hover:shadow-[0_6px_18px_rgba(30,27,46,.12)]"
    >
      <Photo car={car} sizes="(max-width: 640px) 100vw, 300px" className="h-[170px]" />
      <div className="flex flex-col gap-1.5 p-3.5">
        <b className="text-base">
          {car.make} {car.model}
        </b>
        <span className="text-[13px] text-muted">{specs(car)}</span>
        <span className="text-[13px] text-muted">
          {car.mileage_km ? `${n(car.mileage_km)} კმ · ` : ""}{car.city}
        </span>
        <div className="mt-1 text-xl font-bold">{gel(car.price_gel)}</div>
        <div className="rounded-md bg-sun-soft px-2.5 py-2 text-sm">
          თვიურად <b>{gel(car.monthly_from)}</b>-დან
        </div>
      </div>
    </Link>
  );
}
