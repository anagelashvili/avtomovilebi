"use client";

/* eslint-disable @next/next/no-img-element -- dealer's own uploads, shown small */
import Link from "next/link";
import { useEffect, useState } from "react";
import { btn, btn2, card, CameraIcon, ErrorNote, Pill, STATUS_COLOR, td, th } from "@/components/ui";
import { api } from "@/lib/client";
import { CAR_STATUS, shortDate, type DealerCar } from "@/lib/dealer";
import { gel, n } from "@/lib/format";

export default function MyCarsPage() {
  const [cars, setCars] = useState<DealerCar[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<DealerCar[]>("dealer/cars/").then(setCars, (e) => setError(e.message));
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h1 className="text-3xl font-bold">ჩემი მანქანები</h1>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/dealer/import" className={btn2}>Excel-ის ატვირთვა</Link>
          <Link href="/dealer/cars/new" className={btn}>მანქანის დამატება</Link>
        </div>
      </div>
      <ErrorNote>{error}</ErrorNote>
      {cars === null && !error && <p className="text-muted">იტვირთება…</p>}
      {cars?.length === 0 && (
        <div className={`${card} p-8 text-center`}>
          <b>ჯერ მანქანები არ გაქვთ.</b>
          <p className="mt-1 text-muted">ატვირთეთ Excel ან დაამატეთ მანქანა ხელით.</p>
        </div>
      )}
      {!!cars?.length && (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr>
                <th className={th}><span className="sr-only">ფოტო</span></th>
                <th className={th}>ID</th>
                <th className={th}>მანქანა</th>
                <th className={th}>ფასი</th>
                <th className={th}>ფოტო</th>
                <th className={th}>სტატუსი</th>
                <th className={th}>განახლდა</th>
                <th className={th}><span className="sr-only">მოქმედება</span></th>
              </tr>
            </thead>
            <tbody>
              {cars.map((car) => (
                <tr key={car.id} className="border-t border-brand-soft">
                  <td className={td}>
                    {car.photos[0] ? (
                      <img src={car.photos[0].image} alt="" className="h-12 w-[72px] rounded object-cover" />
                    ) : (
                      <span className="flex h-12 w-[72px] items-center justify-center rounded bg-photo"><CameraIcon size={24} /></span>
                    )}
                  </td>
                  <td className={td}>{car.external_id}</td>
                  <td className={td}>{car.make} {car.model} {car.year}</td>
                  <td className={td}>{gel(car.price_gel)}</td>
                  <td className={td}>
                    {car.photos.length ? <Pill color="yellow">{n(car.photos.length)} ფოტო</Pill> : <Pill color="red">ფოტო აკლია</Pill>}
                  </td>
                  <td className={td}><Pill color={STATUS_COLOR[car.status]}>{CAR_STATUS[car.status]}</Pill></td>
                  <td className={td}>{shortDate(car.updated_at)}</td>
                  <td className={td}>
                    <Link href={`/dealer/cars/${car.id}`} className="font-bold text-brand">რედაქტირება</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
