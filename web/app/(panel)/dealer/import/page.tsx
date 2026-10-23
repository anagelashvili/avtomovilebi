"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { btn, btn2, card, ErrorNote, Pill, td, th } from "@/components/ui";
import { api } from "@/lib/client";

type Row = { row: number; external_id: string; action: "new" | "updated" | "error"; errors: string[]; car: string };
type Result = { committed: boolean; counts: { new: number; updated: number; error: number }; rows: Row[] };

/** Screen 8: upload today's Excel, see what each row will do, then save. */
export default function ImportPage() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(f: File, commit: boolean) {
    setBusy(true);
    setError("");
    const form = new FormData();
    form.append("file", f);
    if (commit) form.append("commit", "1");
    try {
      const r = await api<Result>("dealer/import/", { form });
      if (commit) router.push("/dealer/photos");
      else setResult(r);
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  function pick(f: File | undefined) {
    if (!f) return;
    setFile(f);
    send(f, false);
  }

  const savable = result ? result.counts.new + result.counts.updated : 0;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-bold">Excel-ის ატვირთვა</h1>

      <div className={`${card} flex flex-wrap items-center justify-between gap-3 border-2 border-dashed border-cta p-5`}>
        <div>
          <b>{file ? file.name : "აირჩიეთ დღევანდელი ფაილი (.xlsx)"}</b>
          <div className="text-muted">
            {busy ? "მოწმდება…" : file ? (result ? "ფაილი ატვირთულია და შემოწმდა" : "") : "ერთი სტრიქონი = ერთი მანქანა. შეცდომის შემთხვევაში ვაჩვენებთ, რომელ სტრიქონშია პრობლემა."}
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <a href="/api/dealer/import/template/" className={btn2}>შაბლონი</a>
          <button type="button" onClick={() => fileInput.current?.click()} disabled={busy} className={file ? btn2 : btn}>
            {file ? "სხვა ფაილის არჩევა" : "ფაილის არჩევა"}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <ErrorNote>{error}</ErrorNote>

      {result && (
        <>
          <div className="flex flex-wrap gap-2.5">
            <Pill color="yellow">ახალი {result.counts.new}</Pill>
            <Pill color="blue">განახლდება {result.counts.updated}</Pill>
            <Pill color="red">შეცდომა {result.counts.error}</Pill>
          </div>
          <div className={`${card} overflow-x-auto`}>
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr>
                  <th className={th}>სტრიქონი</th>
                  <th className={th}>ID</th>
                  <th className={th}>მანქანა</th>
                  <th className={th}>შემოწმება</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr key={r.row} className="border-t border-brand-soft">
                    <td className={td}>{r.row}</td>
                    <td className={td}>{r.external_id || "—"}</td>
                    <td className={td}>{r.car || "—"}</td>
                    <td className={td}>
                      {r.action === "error" ? (
                        <div className="flex flex-wrap gap-1.5">
                          {r.errors.map((e) => <Pill key={e} color="red">{e}</Pill>)}
                        </div>
                      ) : (
                        <Pill color={r.action === "new" ? "green" : "blue"}>{r.action === "new" ? "ახალი · რიგზეა" : "განახლდება"}</Pill>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={`${card} flex flex-wrap items-center justify-between gap-3 border-cta bg-sun-soft p-[18px]`}>
            <div>
              <b>შემდეგი ნაბიჯი: ფოტოები</b>
              <div className="mt-1">
                {savable} მანქანა შეინახება{result.counts.error ? `, შეცდომიანი ${result.counts.error} სტრიქონი გამოტოვდება` : ""}. შემდეგ ყოველ ახალ მანქანას ფოტოებს დაამატებთ.
              </div>
            </div>
            <button type="button" disabled={busy || savable === 0} onClick={() => file && send(file, true)} className={btn}>
              შენახვა და ფოტოების დამატება →
            </button>
          </div>
          <div>
            <Link href="/dealer/cars" className={btn2}>გაუქმება</Link>
          </div>
        </>
      )}
    </div>
  );
}
