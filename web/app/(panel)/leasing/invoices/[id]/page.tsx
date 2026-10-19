"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { btn, btn2, card, ErrorNote, Pill, STATUS_COLOR, td, th } from "@/components/ui";
import { api } from "@/lib/client";
import { dateTime, money, monthName, type InvoiceDetail } from "@/lib/leasing";

/** Screen 5: one month's invoice, printable / save as PDF. */
export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [inv, setInv] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState("");
  const [showBank, setShowBank] = useState(false);

  useEffect(() => {
    api<InvoiceDetail>(`leasing/invoices/${id}/`).then(setInv, (e) => setError(e.status === 404 ? "ინვოისი ვერ მოიძებნა." : e.message));
  }, [id]);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!inv) return <p className="text-muted">იტვირთება…</p>;

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="breadcrumb" className="text-muted print:hidden">
        <Link href="/leasing/invoices" className="hover:text-brand">ინვოისები</Link> / {monthName(inv.month)}
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h1 className="text-2xl font-bold">ინვოისი · {monthName(inv.month)}</h1>
        <Pill color={STATUS_COLOR[inv.status] ?? "yellow"}>{inv.status === "paid" ? inv.status_label : "გადასახდელი"}</Pill>
      </div>
      <p className="hidden print:block">{inv.company}</p>
      <div className={`${card} overflow-x-auto print:border-0`}>
        <table className="w-full min-w-[600px] border-collapse text-left">
          <thead>
            <tr>
              <th className={th}>კოდი</th>
              <th className={th}>ხელშეკრულება №</th>
              <th className={th}>მანქანა</th>
              <th className={th}>გაფორმდა</th>
              <th className={th}>საკომისიო</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((i) => (
              <tr key={i.code} className="border-t border-brand-soft">
                <td className={td}><b>{i.code}</b></td>
                <td className={td}>{i.contract_number}</td>
                <td className={td}>{i.car}</td>
                <td className={td}>{dateTime(i.signed_at).split(",")[0]}</td>
                <td className={td}>{money(i.amount_gel)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={`${card} flex flex-wrap items-center justify-between gap-3 p-5 print:border-0 print:px-0`}>
        <div>
          <div className="text-muted">სულ გადასახდელი</div>
          <b className="text-[26px]">{money(inv.amount_gel)}</b>
        </div>
        <div className="flex flex-wrap gap-2.5 print:hidden">
          <button type="button" onClick={() => setShowBank((v) => !v)} aria-expanded={showBank} className={btn2}>ბანკის რეკვიზიტები</button>
          <button type="button" onClick={() => window.print()} className={btn}>PDF ინვოისი</button>
        </div>
      </div>
      <p className={`${showBank ? "" : "hidden"} rounded-md bg-white p-4 print:block`}>
        <b>გადახდა საბანკო გადარიცხვით:</b> {inv.bank_details}
      </p>
    </div>
  );
}
