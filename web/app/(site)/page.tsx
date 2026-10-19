import Image from "next/image";
import Link from "next/link";
import { CarTile, photoZoom } from "@/components/car-cards";
import { getCars, getFilters, type CarCard } from "@/lib/api";
import { gel, n } from "@/lib/format";

const MONTHLY = [300, 500, 800, 1200];
const BODIES = [
  { value: "suv", label: "ჯიპი / SUV" },
  { value: "sedan", label: "სედანი" },
  { value: "coupe", label: "კუპე" },
  { value: "hatchback", label: "ჰეჩბეკი" },
];
const STEPS = [
  { title: "აირჩიე მანქანა", text: "ფილტრით ან თვიური გადასახდელით." },
  { title: "გააგზავნე განაცხადი", text: "ერთი ფორმა, რამდენიმე ლიზინგ კომპანია." },
  { title: "მიიღე კოდი", text: "კომპანიაში მისვლისას დაასახელე განაცხადის კოდი." },
];

const sectionTitle = "mb-4 text-2xl font-bold";

export default async function Home() {
  const [{ results: cars }, filters] = await Promise.all([getCars("sort=new"), getFilters()]);
  const latest = cars.slice(0, 4);

  return (
    <>
      <Hero cars={cars} />

      <div className="relative mx-auto -mt-16 max-w-[1240px] px-6">
        <form
          action="/cars"
          className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] items-end gap-4 rounded-[18px] border border-line bg-white px-6 py-5 shadow-[0_18px_40px_rgba(30,27,46,.18)]"
        >
          <label className="flex flex-col gap-1.5 font-bold">
            მანქანის ფასი, მდე
            <input name="price_max" inputMode="numeric" placeholder="მაგ. 40000" className="min-h-11 rounded-md border border-field px-3 font-normal" />
          </label>
          <label className="flex flex-col gap-1.5 font-bold">
            თვიური გადასახდელი, მდე
            <select name="monthly_max" className="min-h-11 rounded-md border border-field bg-white px-3 font-normal">
              <option value="">ნებისმიერი</option>
              {MONTHLY.map((m) => (
                <option key={m} value={m}>{gel(m)}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 font-bold">
            ძარის ტიპი
            <select name="body" className="min-h-11 rounded-md border border-field bg-white px-3 font-normal">
              <option value="">ყველა</option>
              {filters.bodies.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </label>
          <button className="min-h-11 rounded-md bg-brand px-5 text-base font-bold text-white hover:bg-brand-dark">
            განცხადებების ნახვა
          </button>
        </form>
      </div>

      <div className="mx-auto flex max-w-[1240px] flex-col gap-11 px-6 pb-14 pt-10">
        <section>
          <h2 className={sectionTitle}>მოძებნე თვიური გადასახდელით</h2>
          <div className="flex flex-wrap gap-2.5">
            {MONTHLY.map((m) => (
              <Link
                key={m}
                href={`/cars?monthly_max=${m}`}
                className="flex min-h-11 items-center rounded-md border-[1.5px] border-brand bg-white px-[18px] font-semibold text-brand hover:bg-brand-soft"
              >
                თვიურად {n(m)} ლ-მდე
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className={sectionTitle}>ძარის ტიპი</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
            {BODIES.map((b) => {
              const photo = cars.find((c) => c.body === b.value && c.photo)?.photo;
              return (
                <Link key={b.value} href={`/cars?body=${b.value}`} className="group overflow-hidden rounded-lg border border-line bg-white transition-shadow hover:shadow-[0_6px_18px_rgba(30,27,46,.12)]">
                  <div className="relative h-[120px] overflow-hidden bg-[#ece6f6]">
                    {photo && <Image src={photo} alt="" fill sizes="300px" className={photoZoom} />}
                  </div>
                  <div className="px-3 py-2.5 font-semibold">{b.label}</div>
                </Link>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-2xl font-bold">ახალი განცხადებები</h2>
            <Link href="/cars" className="font-semibold text-brand">ყველას ნახვა →</Link>
          </div>
          {latest.length ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
              {latest.map((car) => <CarTile key={car.id} car={car} />)}
            </div>
          ) : (
            <p className="text-muted">ჯერ განცხადებები არ არის.</p>
          )}
        </section>

        <section>
          <h2 className={sectionTitle}>ლიზინგ პარტნიორები</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">
            {filters.companies.map((c) => (
              <Link key={c.value} href={`/cars?company=${c.value}`} className="rounded-lg border border-line bg-white p-5 text-center font-semibold text-muted hover:text-brand">
                {c.label}
              </Link>
            ))}
          </div>
        </section>

        <section id="how">
          <h2 className={sectionTitle}>როგორ მუშაობს</h2>
          <ol className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3.5 rounded-lg border border-line bg-white p-5">
                <span className="flex size-9 flex-none items-center justify-center rounded-full bg-[#ffc800] font-bold">{i + 1}</span>
                <div>
                  <b>{s.title}</b>
                  <div className="mt-1 text-muted">{s.text}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}

// Hero photo tiles: the whole tile grows and comes forward (over its
// neighbours) on hover or keyboard focus; skipped for people who ask their
// system for less motion.
const tile =
  "group relative overflow-hidden rounded-[14px] transition duration-300 ease-out hover:z-10 hover:shadow-[0_18px_40px_rgba(30,27,46,.4)] focus-visible:z-10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink motion-safe:hover:scale-[1.06] motion-safe:focus-visible:scale-[1.06]";
const zoom = "object-cover";

function Hero({ cars }: { cars: CarCard[] }) {
  const withPhotos = cars.filter((c) => c.photo).slice(0, 5);
  const [main, ...rest] = withPhotos;
  return (
    <div className="overflow-hidden bg-[linear-gradient(100deg,#f5a800,#ffe81f)] pb-[110px] pt-14">
      <div className="mx-auto grid max-w-[1240px] items-center gap-10 px-6 lg:grid-cols-[.8fr_1.2fr]">
        <div className="flex flex-col gap-6">
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">იპოვე მანქანა და ლიზინგი ერთ ადგილას</h1>
          <ul className="flex flex-col gap-3.5 text-lg font-bold sm:text-xl">
            {["ავტომობილები ყველა ლიზინგ კომპანიისგან", "შეადარე შეთავაზებები ერთ ადგილას", "ერთი განაცხადი და ერთი კოდი"].map((t) => (
              <li key={t} className="flex items-start gap-4">
                <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-none sm:mt-1">
                  <path d="M4 12.5l5 5L20 6.5" />
                </svg>
                {t}
              </li>
            ))}
          </ul>
        </div>
        {main && (
          <div className="grid h-[400px] grid-cols-[2fr_1fr_1fr] grid-rows-2 gap-2.5 max-sm:h-[260px] max-sm:grid-cols-1 max-sm:grid-rows-1">
            <Link href={`/cars/${main.id}`} className={`${tile} row-span-2`}>
              <Image src={main.photo!} alt={`${main.make} ${main.model}`} fill priority sizes="(max-width: 640px) 100vw, 500px" className={zoom} />
              <span className="absolute bottom-3.5 left-3.5 rounded-full bg-white px-4 py-2 text-sm font-bold transition-colors duration-300 group-hover:bg-ink group-hover:text-white">
                {main.make} {main.model} · თვიურად {gel(main.monthly_from)}-დან
              </span>
            </Link>
            {rest.map((c) => (
              <Link key={c.id} href={`/cars/${c.id}`} className={`${tile} max-sm:hidden`}>
                <Image src={c.photo!} alt={`${c.make} ${c.model}`} fill sizes="250px" className={zoom} />
                {/* Small tiles have no label; show one when hovered. */}
                <span className="absolute inset-x-2 bottom-2 truncate rounded-full bg-white/95 px-3 py-1 text-center text-xs font-bold opacity-0 transition duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 motion-safe:translate-y-2 motion-safe:group-hover:translate-y-0 motion-safe:group-focus-visible:translate-y-0">
                  {c.make} {c.model} · {gel(c.monthly_from)}/თვე
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
