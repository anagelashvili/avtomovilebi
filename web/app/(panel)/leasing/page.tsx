"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { card, ErrorNote, input, Pill, STATUS_COLOR, td, th } from "@/components/ui";
import { api } from "@/lib/client";
import { keepValues } from "@/lib/forms";
import { shortDate } from "@/lib/dealer";
import type { AppDetail, AppRow } from "@/lib/leasing";

const FILTERS = [
  { value: "", label: "ყველა" },
  { value: "new", label: "ახალი" },
  { value: "arrived", label: "მივიდა" },
  { value: "signed", label: "გაფორმდა" },
  { value: "rejected", label: "უარი" },
];

/** Screen 3: applications list and the code entry. */
export default function LeasingHome() {
  const router = useRouter();
  const [rows, setRows] = useState<AppRow[] | null>(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<AppRow[]>(`leasing/applications/${filter ? `?status=${filter}` : ""}`).then(setRows, (e) => setError(e.message));
  }, [filter]);

  async function open(form: FormData) {
    setBusy(true);
    setCodeError("");
    try {
      const app = await api<AppDetail>("leasing/applications/open/", { json: { code: form.get("code") } });
      router.push(`/leasing/applications/${app.code}`);
    } catch (e) {
      setCodeError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={keepValues(open)} className="flex flex-wrap items-center gap-3 rounded-lg bg-[linear-gradient(100deg,#f5a800,#ffe81f)] p-5">
        <label htmlFor="code" className="text-[17px] font-bold">კლიენტი მოვიდა? შეიყვანეთ კოდი:</label>
        <input id="code" name="code" required placeholder="GL-00000" autoComplete="off" className={`${input} max-w-[260px]`} />
        <button disabled={busy} className="min-h-11 rounded-md bg-ink px-5 font-bold text-white disabled:opacity-60">გახსნა</button>
        {codeError && <p role="alert" className="w-full font-semibold text-[#9a1c1c]">{codeError}</p>}
      </form>

      <div>
        <h1 className="text-2xl font-bold">განაცხადები</h1>
        <p className="mt-1 text-muted">კლიენტის მონაცემები და კოდი იხსნება კოდის შეყვანის შემდეგ.</p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="სტატუსის ფილტრი">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`min-h-11 rounded-full px-4 font-semibold ${filter === f.value ? "bg-brand text-white" : "bg-white text-brand-dark ring-1 ring-line"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ErrorNote>{error}</ErrorNote>
      {rows === null && !error && <p className="text-muted">იტვირთება…</p>}
      {rows?.length === 0 && <div className={`${card} p-8 text-center text-muted`}>განაცხადები არ არის.</div>}
      {!!rows?.length && (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[700px] border-collapse text-left">
            <thead>
              <tr>
                <th className={th}>კოდი</th>
                <th className={th}>კლიენტი</th>
                <th className={th}>ტელეფონი</th>
                <th className={th}>მანქანა</th>
                <th className={th}>თარიღი</th>
                <th className={th}>სტატუსი</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-brand-soft">
                  <td className={td}>
                    {r.opened ? (
                      <Link href={`/leasing/applications/${r.code}`} className="font-bold text-brand">{r.code}</Link>
                    ) : (
                      <b className="text-muted" aria-label="კოდი დაფარულია">{r.code}</b>
                    )}
                  </td>
                  <td className={td}>{r.first_name} {r.last_name}</td>
                  <td className={`${td} ${r.opened ? "" : "text-muted"}`}>{r.phone}</td>
                  <td className={td}>{r.car}</td>
                  <td className={td}>{shortDate(r.created_at)}</td>
                  <td className={td}><Pill color={STATUS_COLOR[r.status]}>{r.status_label}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
