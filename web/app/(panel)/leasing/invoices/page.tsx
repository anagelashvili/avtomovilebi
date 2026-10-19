"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { card, ErrorNote, Pill, STATUS_COLOR, td, th } from "@/components/ui";
import { api } from "@/lib/client";
import { money, monthName, type InvoiceRow } from "@/lib/leasing";

export default function InvoicesPage() {
  const [rows, setRows] = useState<InvoiceRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<InvoiceRow[]>("leasing/invoices/").then(setRows, (e) => setError(e.message));
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">ინვოისები</h1>
      <ErrorNote>{error}</ErrorNote>
      {rows === null && !error && <p className="text-muted">იტვირთება…</p>}
      {rows?.length === 0 && (
        <div className={`${card} p-8 text-center text-muted`}>ინვოისები ჯერ არ არის. ინვოისი იქმნება თვის დასაწყისში, წინა თვის გაფორმებულ გარიგებებზე.</div>
      )}
      {!!rows?.length && (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr>
                <th className={th}>თვე</th>
                <th className={th}>გარიგებები</th>
                <th className={th}>თანხა</th>
                <th className={th}>სტატუსი</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-brand-soft">
                  <td className={td}>
                    <Link href={`/leasing/invoices/${r.id}`} className="font-bold text-brand">{monthName(r.month)}</Link>
                  </td>
                  <td className={td}>{r.deals}</td>
                  <td className={td}>{money(r.amount_gel)}</td>
                  <td className={td}><Pill color={STATUS_COLOR[r.status] ?? "yellow"}>{r.status_label}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
