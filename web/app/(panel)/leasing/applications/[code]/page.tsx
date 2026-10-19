"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { btn, btn2, card, ErrorNote, input, Pill, STATUS_COLOR } from "@/components/ui";
import { api } from "@/lib/client";
import { gel } from "@/lib/format";
import { dateTime, type AppDetail } from "@/lib/leasing";

/** Screen 4: the opened application, its status, print / save as PDF. */
export default function ApplicationPage() {
  const { code } = useParams<{ code: string }>();
  const [app, setApp] = useState<AppDetail | null>(null);
  const [error, setError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<AppDetail>(`leasing/applications/${code}/`).then(setApp, (e) =>
      setError(e.status === 404 ? "განაცხადი ვერ მოიძებნა ან კოდი ჯერ არ შეგიყვანიათ." : e.message),
    );
  }, [code]);

  async function change(status: string, form?: FormData) {
    setBusy(true);
    setStatusError("");
    try {
      setApp(
        await api<AppDetail>(`leasing/applications/${code}/status/`, {
          json: { status, contract_number: form?.get("contract_number") ?? "" },
        }),
      );
    } catch (e) {
      setStatusError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!app) return <p className="text-muted">იტვირთება…</p>;

  const rows: [string, string][] = [
    ["სახელი, გვარი", `${app.first_name} ${app.last_name}`],
    ["პირადი ნომერი", app.personal_id],
    ["ტელეფონი", app.phone],
    ["ელ-ფოსტა", app.email || "—"],
    ["მანქანა", app.car],
    ["დილერი · ID", `${app.dealer} · ${app.car_external_id}`],
    ["ფასი", gel(app.car_price_gel)],
    ["შეთავაზება", `${gel(app.monthly_gel)}/თვე · ${app.term_months} თვე · შენატანი ${gel(app.down_payment_gel)}`],
    ["განაცხადი გაიგზავნა", dateTime(app.created_at)],
  ];
  const canSign = app.next_statuses.some((s) => s.value === "signed");
  const canReject = app.next_statuses.some((s) => s.value === "rejected");

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="breadcrumb" className="text-muted print:hidden">
        <Link href="/leasing" className="hover:text-brand">განაცხადები</Link> / {app.code}
      </nav>
      <div className="grid items-start gap-5 lg:grid-cols-[1.4fr_1fr] print:block">
        <section className={`${card} p-[22px] print:border-0 print:p-0`}>
          <h1 className="text-[17px] font-bold print:text-2xl">განაცხადი {app.code}</h1>
          <dl className="mt-2">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-brand-soft py-2.5">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right font-bold">{v}</dd>
              </div>
            ))}
            {app.contract_number && (
              <div className="flex justify-between gap-4 border-b border-brand-soft py-2.5">
                <dt className="text-muted">ხელშეკრულების ნომერი</dt>
                <dd className="font-bold">{app.contract_number}</dd>
              </div>
            )}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2.5 print:hidden">
            <button type="button" onClick={() => window.print()} className={btn}>ბეჭდვა</button>
            <button type="button" onClick={() => window.print()} className={btn2}>PDF-ად შენახვა</button>
          </div>
        </section>

        <section className={`${card} flex flex-col gap-3 p-[22px] print:hidden`}>
          <h2 className="text-[17px] font-bold">სტატუსი</h2>
          <div className="flex items-center gap-2">
            <Pill color={STATUS_COLOR[app.status]}>{app.status_label}</Pill>
            <span className="text-sm text-muted">კოდი შეყვანილია {dateTime(app.opened_at)}</span>
          </div>
          {canSign && (
            <form action={(f) => change("signed", f)} className="flex flex-col gap-2">
              <label className="flex flex-col gap-1">
                ხელშეკრულების ნომერი
                <input name="contract_number" required placeholder="№" className={input} />
              </label>
              <button disabled={busy} className={btn}>გაფორმდა</button>
            </form>
          )}
          {canReject && (
            <button type="button" disabled={busy} onClick={() => change("rejected")} className={btn2}>უარი</button>
          )}
          <ErrorNote>{statusError}</ErrorNote>
          <div>
            <h3 className="mb-1 mt-2 font-semibold">ისტორია</h3>
            <ol className="flex flex-col gap-1 text-[13px] text-muted">
              {app.history.map((h) => (
                <li key={h.at}>{dateTime(h.at)} · {h.from} → {h.to} · {h.user}</li>
              ))}
            </ol>
            <p className="mt-2 text-[13px] text-muted">სტატუსის ყველა ცვლილება ჩაიწერება: ვინ და როდის.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
