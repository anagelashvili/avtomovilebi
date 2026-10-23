"use client";

import { useCallback, useEffect, useState } from "react";
import { btn, btn2, card, ErrorNote, Pill, STATUS_COLOR, td, th } from "@/components/ui";
import { api } from "@/lib/client";
import { money, monthName, type InvoiceRow } from "@/lib/leasing";

type Overview = {
  month: string;
  totals: { applications: number; arrived: number; signed: number; commission_gel: string };
  companies: {
    id: number;
    company: string;
    applications: number;
    arrived: number;
    signed: number;
    commission_gel: string;
    invoice: InvoiceRow | null;
  }[];
  suspicious: { code: string; company: string; reason: string }[];
};

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Screen 6: our team's monthly overview. */
export default function OverviewPage() {
  const [month, setMonth] = useState(thisMonth);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<Overview>(`staff/overview/?month=${month}`).then(setData, (e) => setError(e.message));
  }, [month]);
  useEffect(load, [load]);

  async function act(work: () => Promise<string>) {
    setBusy(true);
    setError("");
    setNote("");
    try {
      setNote(await work());
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const generate = () =>
    act(async () => {
      const r = await api<{ month: string; updated: number }>("staff/invoices/generate/", { json: { month } });
      return `${monthName(r.month)}: განახლდა ${r.updated} ინვოისი.`;
    });

  const setInvoice = (id: number, status: string) =>
    act(async () => {
      await api(`staff/invoices/${id}/status/`, { json: { status } });
      return "ინვოისის სტატუსი შეიცვალა.";
    });

  const tiles = data
    ? [
        ["განაცხადები", String(data.totals.applications)],
        ["მივიდა", String(data.totals.arrived)],
        ["გაფორმდა", String(data.totals.signed)],
        ["საკომისიო", money(data.totals.commission_gel)],
      ]
    : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">ადმინი · {monthName(month)}</h1>
        <div className="flex flex-wrap items-end gap-2.5">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            თვე
            <input type="month" value={month} max={thisMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} className="min-h-11 rounded-md border border-field bg-white px-3" />
          </label>
          <button type="button" onClick={generate} disabled={busy} className={btn}>ინვოისების შექმნა ამ თვისთვის</button>
        </div>
      </div>

      <ErrorNote>{error}</ErrorNote>
      {note && <p role="status" className="font-semibold text-ok">{note}</p>}
      {!data && !error && <p className="text-muted">იტვირთება…</p>}

      {data && (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            {tiles.map(([label, value]) => (
              <div key={label} className={`${card} p-[18px]`}>
                <div className="text-muted">{label}</div>
                <b className="text-[26px]">{value}</b>
              </div>
            ))}
          </div>

          <div className={`${card} overflow-x-auto`}>
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr>
                  <th className={th}>კომპანია</th>
                  <th className={th}>განაცხადები</th>
                  <th className={th}>მივიდა</th>
                  <th className={th}>გაფორმდა</th>
                  <th className={th}>საკომისიო</th>
                  <th className={th}>ინვოისი</th>
                </tr>
              </thead>
              <tbody>
                {data.companies.map((c) => (
                  <tr key={c.id} className="border-t border-brand-soft">
                    <td className={td}>{c.company}</td>
                    <td className={td}>{c.applications}</td>
                    <td className={td}>{c.arrived}</td>
                    <td className={td}>{c.signed}</td>
                    <td className={td}>{money(c.commission_gel)}</td>
                    <td className={td}>
                      {c.invoice ? (
                        <span className="flex flex-wrap items-center gap-2">
                          <Pill color={STATUS_COLOR[c.invoice.status] ?? "yellow"}>{c.invoice.status_label}</Pill>
                          {c.invoice.status === "draft" && (
                            <button type="button" disabled={busy} onClick={() => setInvoice(c.invoice!.id, "sent")} className={`${btn2} min-h-9 px-3 text-sm`}>გაგზავნილია</button>
                          )}
                          {c.invoice.status !== "paid" && (
                            <button type="button" disabled={busy} onClick={() => setInvoice(c.invoice!.id, "paid")} className={`${btn2} min-h-9 px-3 text-sm`}>გადახდილია</button>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className={`${card} p-5`}>
            <h2 className="font-bold">საეჭვო</h2>
            {data.suspicious.length === 0 ? (
              <p className="mt-1.5 text-muted">საეჭვო შემთხვევები არ არის.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {data.suspicious.map((s) => (
                  <li key={`${s.code}-${s.reason}`}>
                    <b>{s.code}</b> · {s.company} · <span className="text-[#9a1c1c]">{s.reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
