"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PhotoManager } from "@/components/photo-manager";
import { btn, btn2, card, ErrorNote, Pill } from "@/components/ui";
import { api } from "@/lib/client";
import type { DealerCar } from "@/lib/dealer";

/** Screen 8b: after an Excel upload, add photos car by car, then publish. */
export default function PhotosPage() {
  const [cars, setCars] = useState<DealerCar[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");

  useEffect(() => {
    api<DealerCar[]>("dealer/cars/").then(
      (all) => setCars(all.filter((c) => c.status === "draft")),
      (e) => setError(e.message),
    );
  }, []);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!cars) return <p className="text-muted">იტვირთება…</p>;

  const withPhotos = cars.filter((c) => c.photos.length > 0);
  const replace = (car: DealerCar) => setCars((cs) => cs!.map((c) => (c.id === car.id ? car : c)));

  async function publishAll() {
    setBusy(true);
    setError("");
    try {
      for (const car of withPhotos) await api(`dealer/cars/${car.id}/publish/`, { method: "POST" });
      setDone(`გამოქვეყნდა ${withPhotos.length} მანქანა.`);
      setCars((cs) => cs!.filter((c) => c.photos.length === 0));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-bold">ფოტოების დამატება</h1>
        <p className="mt-1 text-muted">ფოტოებს ყველა მანქანას ცალ-ცალკე ამატებთ. პირველი ფოტო მთავარი იქნება.</p>
      </div>

      {done && <p role="status" className="font-semibold text-[#17653a]">{done}</p>}

      {cars.length === 0 ? (
        <div className={`${card} p-8 text-center`}>
          <b>დრაფტად დარჩენილი მანქანები არ არის.</b>
          <div className="mt-3"><Link href="/dealer/cars" className={btn2}>ჩემი მანქანები</Link></div>
        </div>
      ) : (
        <>
          <div className={`${card} p-[18px]`}>
            <div className="mb-2 flex justify-between">
              <b>ფოტო დაემატა {withPhotos.length} მანქანას {cars.length}-დან</b>
              <span className="text-muted">{withPhotos.length}/{cars.length}</span>
            </div>
            <div className="h-2.5 rounded-full bg-[#ece6f6]" role="progressbar" aria-valuemin={0} aria-valuemax={cars.length} aria-valuenow={withPhotos.length}>
              <div className="h-2.5 rounded-full bg-[#ffc800]" style={{ width: `${(withPhotos.length / cars.length) * 100}%` }} />
            </div>
          </div>

          {cars.map((car) => (
            <div key={car.id} className={`${card} flex flex-wrap items-center justify-between gap-4 px-4 py-3.5`}>
              <div className="min-w-[200px]">
                <b>{car.make} {car.model} {car.year}</b>
                <div className="text-muted">{car.external_id}</div>
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3">
                <div className="min-w-[260px] max-w-[560px] flex-1">
                  <PhotoManager car={car} onChange={replace} compact />
                </div>
                {car.photos.length ? <Pill color="green">{car.photos.length} ფოტო</Pill> : <Pill color="yellow">ფოტო აკლია</Pill>}
              </div>
            </div>
          ))}

          <ErrorNote>{error}</ErrorNote>
          <div className="flex flex-wrap gap-2.5">
            <button type="button" onClick={publishAll} disabled={busy || withPhotos.length === 0} className={btn}>
              გამოქვეყნება ფოტოიანი მანქანების ({withPhotos.length})
            </button>
            <Link href="/dealer/cars" className={btn2}>მოგვიანებით</Link>
          </div>
          <p className="text-[13px] text-muted">ფოტოს გარეშე მანქანა დრაფტად რჩება და საიტზე არ ჩანს.</p>
        </>
      )}
    </div>
  );
}
