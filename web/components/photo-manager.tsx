"use client";

/* eslint-disable @next/next/no-img-element -- dealer's own uploads, shown small */
import { useRef, useState } from "react";
import { api } from "@/lib/client";
import type { DealerCar } from "@/lib/dealer";
import { CameraIcon, ErrorNote } from "./ui";

/** Upload, reorder (first = main) and delete one car's photos. */
export function PhotoManager({
  car,
  onChange,
  compact = false,
}: {
  car: DealerCar;
  onChange: (car: DealerCar) => void;
  compact?: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  async function run(work: () => Promise<DealerCar | void>) {
    setBusy(true);
    setError("");
    try {
      const updated = await work();
      if (updated) onChange(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function upload(files: FileList | null) {
    if (!files?.length) return;
    const form = new FormData();
    for (const f of Array.from(files)) form.append("image", f);
    run(() => api<DealerCar>(`dealer/cars/${car.id}/photos/`, { form }));
  }

  function makeMain(id: number) {
    const ids = [id, ...car.photos.map((p) => p.id).filter((p) => p !== id)];
    run(() => api<DealerCar>(`dealer/cars/${car.id}/photos/order/`, { json: { ids } }));
  }

  function remove(id: number) {
    run(async () => {
      await api(`dealer/cars/${car.id}/photos/${id}/`, { method: "DELETE" });
      return api<DealerCar>(`dealer/cars/${car.id}/`);
    });
  }

  const thumb = compact ? "h-[54px] w-16" : "h-[90px] w-full";

  return (
    <div className="flex flex-col gap-3" aria-busy={busy}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          upload(e.dataTransfer.files);
        }}
        className={`rounded-lg border-2 border-dashed border-cta text-center ${dragging ? "bg-sun-soft" : "bg-sun-soft"} ${compact ? "px-4 py-3" : "p-5"}`}
      >
        გადმოაგდეთ ფოტოები აქ ან{" "}
        <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className="font-bold text-brand underline">
          აირჩიეთ ფაილები
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            upload(e.target.files);
            e.target.value = "";
          }}
        />
        {busy && <span className="ml-2 text-muted">იტვირთება…</span>}
      </div>

      {car.photos.length > 0 && (
        <ul className={compact ? "flex flex-wrap gap-1.5" : "grid grid-cols-4 gap-2"}>
          {car.photos.map((p, i) => (
            <li key={p.id} className={`group relative overflow-hidden rounded-md border ${i === 0 ? "border-2 border-brand" : "border-line"}`}>
              <img src={p.image} alt={i === 0 ? "მთავარი ფოტო" : `ფოტო ${i + 1}`} className={`${thumb} object-cover`} />
              {i === 0 && !compact && (
                <span className="absolute left-1 top-1 rounded bg-brand px-1.5 text-xs font-bold text-white">მთავარი</span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink/70 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                {i > 0 ? (
                  <button type="button" onClick={() => makeMain(p.id)} disabled={busy} className="px-1.5 py-1 text-xs font-semibold text-white" aria-label="მთავარ ფოტოდ დაყენება">
                    ★
                  </button>
                ) : <span />}
                <button type="button" onClick={() => remove(p.id)} disabled={busy} className="px-1.5 py-1 text-xs font-semibold text-white" aria-label="ფოტოს წაშლა">
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {car.photos.length === 0 && !compact && (
        <div className="flex h-[90px] items-center justify-center rounded-md bg-photo">
          <CameraIcon />
        </div>
      )}
      {!compact && (
        <p className="text-[13px] text-muted">
          პირველი ფოტო მთავარია. ★ — მთავარად დაყენება. ფოტო მინიმუმ 1000 პიქსელი სიგანისა უნდა იყოს — ატვირთეთ ორიგინალი, არა სქრინშოტი.
        </p>
      )}
      <ErrorNote>{error}</ErrorNote>
    </div>
  );
}
