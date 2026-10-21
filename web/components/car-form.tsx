"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/client";
import { BODIES, CAR_STATUS, FUELS, TRANSMISSIONS, type DealerCar } from "@/lib/dealer";
import { PhotoManager } from "./photo-manager";
import { Select } from "./select";
import { btn, btn2, card, ErrorNote, input, Pill, STATUS_COLOR } from "./ui";

type Field = {
  name: keyof DealerCar;
  label: string;
  type?: "number";
  options?: { value: string; label: string }[];
  required?: boolean;
};

const FIELDS: Field[] = [
  { name: "make", label: "მარკა", required: true },
  { name: "model", label: "მოდელი", required: true },
  { name: "year", label: "წელი", type: "number", required: true },
  { name: "body", label: "ძარის ტიპი", options: BODIES },
  { name: "fuel", label: "საწვავი", options: FUELS, required: true },
  { name: "engine", label: "ძრავა" },
  { name: "transmission", label: "გადაცემათა კოლოფი", options: TRANSMISSIONS, required: true },
  { name: "mileage_km", label: "გარბენი, კმ", type: "number", required: true },
  { name: "price_gel", label: "ფასი, ლ", type: "number", required: true },
  { name: "city", label: "ქალაქი", required: true },
  { name: "external_id", label: "ID / ნომერი", required: true },
];

/** Screen 9: add a car by hand, or edit one. Photos can be added once it's saved. */
export function CarForm({ initial }: { initial?: DealerCar }) {
  const router = useRouter();
  const [car, setCar] = useState<DealerCar | undefined>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(form: FormData, publish: boolean) {
    setBusy(true);
    setErrors({});
    setMessage("");
    setSaved("");
    const body: Record<string, unknown> = {};
    for (const f of [...FIELDS.map((f) => f.name), "description"]) body[f] = String(form.get(f) ?? "").trim();
    try {
      let result = car
        ? await api<DealerCar>(`dealer/cars/${car.id}/`, { method: "PATCH", json: body })
        : await api<DealerCar>("dealer/cars/", { json: body });
      if (publish) result = await api<DealerCar>(`dealer/cars/${result.id}/publish/`, { method: "POST" });
      setCar(result);
      setSaved(publish ? "გამოქვეყნდა." : "შენახულია.");
      if (!car) router.replace(`/dealer/cars/${result.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.data && typeof e.data === "object" && !("detail" in e.data)) {
        const fieldErrors: Record<string, string> = {};
        for (const [k, v] of Object.entries(e.data)) fieldErrors[k] = [v].flat().join(" ");
        setErrors(fieldErrors);
      } else {
        setMessage((e as Error).message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function unpublish() {
    if (!car) return;
    setBusy(true);
    try {
      setCar(await api<DealerCar>(`dealer/cars/${car.id}/unpublish/`, { method: "POST" }));
      setSaved("საიტიდან მოიხსნა.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        save(new FormData(e.currentTarget), submitter?.value === "publish");
      }}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">{car ? `${car.make} ${car.model}` : "მანქანის დამატება ხელით"}</h1>
        {car && <Pill color={STATUS_COLOR[car.status]}>{CAR_STATUS[car.status]}</Pill>}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1.2fr_1fr]">
        <section className={`${card} flex flex-col gap-3 p-5`}>
          <h2 className="text-[17px] font-bold">მანქანის მონაცემები</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
            {FIELDS.map((f) =>
              f.options ? (
                <div key={f.name} className="flex flex-col gap-1">
                  <Select
                    label={f.label}
                    labelClassName=""
                    className="gap-1"
                    name={f.name}
                    required={f.required}
                    defaultValue={String(car?.[f.name] ?? "")}
                    options={[{ value: "", label: f.required ? "აირჩიეთ" : "—" }, ...f.options]}
                  />
                  {errors[f.name] && <span className="text-sm text-[#9a1c1c]">{errors[f.name]}</span>}
                </div>
              ) : (
                <label key={f.name} className="flex flex-col gap-1">
                  {f.label}
                  <input
                    name={f.name}
                    defaultValue={String(car?.[f.name] ?? "")}
                    required={f.required}
                    inputMode={f.type === "number" ? "numeric" : undefined}
                    aria-invalid={!!errors[f.name]}
                    className={input}
                  />
                  {errors[f.name] && <span className="text-sm text-[#9a1c1c]">{errors[f.name]}</span>}
                </label>
              ),
            )}
          </div>
          <label className="flex flex-col gap-1">
            აღწერა
            <textarea name="description" defaultValue={car?.description ?? ""} className={`${input} min-h-[90px] py-2`} />
          </label>
        </section>

        <section className={`${card} flex flex-col gap-3 p-5`}>
          <h2 className="text-[17px] font-bold">ფოტოები</h2>
          {car ? (
            <PhotoManager car={car} onChange={setCar} />
          ) : (
            <p className="text-muted">ფოტოებს დაამატებთ მანქანის შენახვის შემდეგ.</p>
          )}
          <p className="text-[13px] text-muted">ფოტოს გარეშე მანქანა დრაფტად რჩება და საიტზე არ ჩანს.</p>
        </section>
      </div>

      <ErrorNote>{message}</ErrorNote>
      {saved && <p role="status" className="font-semibold text-[#17653a]">{saved}</p>}
      <div className="flex flex-wrap gap-2.5">
        {!car ? (
          <button name="action" value="draft" disabled={busy} className={btn}>შენახვა და ფოტოების დამატება →</button>
        ) : (
          <>
            <button name="action" value="publish" disabled={busy || car.photos.length === 0} className={btn}>
              {car.status === "active" ? "შენახვა" : "გამოქვეყნება"}
            </button>
            {car.status === "active" ? (
              <button type="button" onClick={unpublish} disabled={busy} className={btn2}>საიტიდან მოხსნა</button>
            ) : (
              <button name="action" value="draft" disabled={busy} className={btn2}>დრაფტად შენახვა</button>
            )}
          </>
        )}
      </div>
    </form>
  );
}
