"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ErrorNote } from "@/components/ui";
import { api, ApiError } from "@/lib/client";
import { gel } from "@/lib/format";
import { keepValues } from "@/lib/forms";
import { dateTime } from "@/lib/leasing";

type MyApp = {
  code: string;
  car: string;
  car_id: number;
  company: string;
  company_address: string;
  company_phone: string;
  monthly_gel: number;
  term_months: number;
  status: "new" | "arrived" | "signed" | "rejected";
  status_label: string;
  created_at: string;
  opened_at: string | null;
  signed_at: string | null;
};

const field = "min-h-11 w-full rounded-md border border-field bg-white px-3";
const btn = "min-h-11 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark disabled:opacity-60";

/** Phone → SMS code → list of the buyer's applications. */
export function MyApplications() {
  const [apps, setApps] = useState<MyApp[] | null>(null);
  const [checking, setChecking] = useState(true);
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [info, setInfo] = useState("");
  const [devCode, setDevCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    return api<MyApp[]>("my/applications/")
      .then(setApps, (e) => {
        // 403 = phone not confirmed yet: show the phone form.
        if (!(e instanceof ApiError && e.status === 403)) setError(e.message);
        setApps(null);
      })
      .finally(() => setChecking(false));
  }
  useEffect(() => {
    api<MyApp[]>("my/applications/")
      .then(setApps, (e) => {
        if (!(e instanceof ApiError && e.status === 403)) setError(e.message);
      })
      .finally(() => setChecking(false));
  }, []);

  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const requestCode = (form: FormData) =>
    run(async () => {
      const p = String(form.get("phone") ?? "");
      const r = await api<{ detail: string; debug_code?: string }>("my/code/", { json: { phone: p } });
      setPhone(p);
      setInfo(r.detail);
      setDevCode(r.debug_code ?? "");
      setStep("code");
    });

  const verify = (form: FormData) =>
    run(async () => {
      await api("my/verify/", { json: { phone, code: form.get("code") } });
      setStep("phone");
      setInfo("");
      setDevCode("");
      await load();
    });

  const leave = () =>
    run(async () => {
      await api("my/applications/", { method: "DELETE" });
      setApps(null);
    });

  if (checking) return <p className="text-muted">იტვირთება…</p>;

  if (apps) {
    return (
      <div className="flex flex-col gap-4">
        {apps.length === 0 && <p className="rounded-lg border border-line bg-white p-6 text-muted">ამ ნომრით განაცხადები არ მოიძებნა.</p>}
        {apps.map((a) => <ApplicationCard key={a.code} app={a} />)}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/cars" className="font-semibold text-brand">← მანქანების ნახვა</Link>
          <button type="button" onClick={leave} disabled={busy} className="min-h-11 rounded-md px-3 font-semibold text-brand hover:bg-brand-soft">
            გასვლა
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md rounded-lg border border-line bg-white p-6">
      {step === "phone" ? (
        <form onSubmit={keepValues(requestCode)} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 font-semibold">
            ტელეფონი, რომლითაც განაცხადი გააგზავნეთ
            <input name="phone" type="tel" required autoComplete="tel" placeholder="5XX XX XX XX" defaultValue={phone} className={`${field} font-normal`} />
          </label>
          <ErrorNote>{error}</ErrorNote>
          <button disabled={busy} className={btn}>{busy ? "იგზავნება…" : "კოდის მიღება"}</button>
        </form>
      ) : (
        <form onSubmit={keepValues(verify)} className="flex flex-col gap-3">
          <p role="status" className="text-sm text-muted">{info}</p>
          {devCode && (
            <p className="rounded-md bg-sun-soft px-3 py-2 text-sm text-sun-ink">
              ტესტის რეჟიმი (SMS ჯერ არ არის ჩართული): კოდი <b>{devCode}</b>
            </p>
          )}
          <label className="flex flex-col gap-1.5 font-semibold">
            SMS კოდი
            <input name="code" required inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={`${field} font-normal tracking-[0.3em]`} />
          </label>
          <ErrorNote>{error}</ErrorNote>
          <button disabled={busy} className={btn}>{busy ? "მოწმდება…" : "დადასტურება"}</button>
          <button type="button" onClick={() => { setStep("phone"); setError(""); }} className="text-sm font-semibold text-brand">
            ← სხვა ნომერი
          </button>
        </form>
      )}
    </div>
  );
}

const STEPS = [
  { key: "new", label: "გაიგზავნა" },
  { key: "arrived", label: "კომპანიაში მიხვედით" },
  { key: "signed", label: "გაფორმდა" },
];

function ApplicationCard({ app }: { app: MyApp }) {
  const reached = { new: 0, arrived: 1, signed: 2, rejected: 1 }[app.status];
  const dates = [app.created_at, app.opened_at, app.signed_at];
  return (
    <article className="rounded-lg border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/cars/${app.car_id}`} className="text-lg font-bold hover:text-brand">{app.car}</Link>
          <div className="text-muted">{app.company} · {gel(app.monthly_gel)}/თვე · {app.term_months} თვე</div>
        </div>
        <div className="rounded-lg border-2 border-dashed border-cta bg-sun-soft px-3 py-1.5 text-lg font-bold tracking-[2px]">{app.code}</div>
      </div>

      <ol className="mt-5 grid grid-cols-3 gap-2" aria-label="განაცხადის ეტაპები">
        {STEPS.map((s, i) => {
          const done = i <= reached && !(app.status === "rejected" && i === 2);
          return (
            <li key={s.key} className="flex flex-col gap-1.5">
              <span className={`h-1.5 rounded-full ${done ? "bg-brand" : "bg-line"}`} />
              <span className={`text-sm ${done ? "font-semibold" : "text-muted"}`}>{s.label}</span>
              {done && dates[i] && <span className="text-xs text-muted">{dateTime(dates[i]).split(",")[0]}</span>}
            </li>
          );
        })}
      </ol>

      {app.status === "new" && (
        <p className="mt-4 rounded-md bg-sun-soft px-3 py-2 text-sm text-sun-ink">
          შემდეგი ნაბიჯი: მიდით {app.company}-ში{app.company_address ? ` (${app.company_address})` : ""} და დაასახელეთ კოდი <b>{app.code}</b>.
        </p>
      )}
      {app.status === "rejected" && (
        <p className="mt-4 rounded-md bg-[#fde0e0] px-3 py-2 text-sm text-[#9a1c1c]">
          კომპანიამ განაცხადზე უარი თქვა. შეგიძლიათ სხვა შეთავაზება აირჩიოთ.
        </p>
      )}
    </article>
  );
}
