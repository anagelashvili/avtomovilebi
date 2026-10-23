"use client";

import { useCallback, useEffect, useState } from "react";
import { btn, btn2, card, ErrorNote, input, Pill, td, th } from "@/components/ui";
import { api, ApiError } from "@/lib/client";

type Member = {
  id: number;
  name: string;
  email: string;
  role: "owner" | "manager";
  role_label: string;
  is_active: boolean;
  invited: boolean;
};

/** Company owners invite managers and turn their access off. */
export default function MembersPage() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<Member[]>("org/members/").then(setMembers, (e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function run(work: () => Promise<string>) {
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

  async function invite(form: HTMLFormElement) {
    setFieldErrors({});
    setBusy(true);
    setError("");
    setNote("");
    try {
      const m = await api<Member>("org/members/", { json: Object.fromEntries(new FormData(form)) });
      setNote(`მოწვევა გაიგზავნა ${m.email}-ზე.`);
      form.reset();
      load();
    } catch (e) {
      if (e instanceof ApiError && e.data && typeof e.data === "object" && !("detail" in e.data)) {
        const errs: Record<string, string> = {};
        for (const [k, v] of Object.entries(e.data)) errs[k] = [v].flat().join(" ");
        setFieldErrors(errs);
      } else {
        setError((e as Error).message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">თანამშრომლები</h1>
        <p className="mt-1 text-muted">მოიწვიეთ მენეჯერები. ისინი ელ-ფოსტაზე მიიღებენ ბმულს და პაროლს თავად დააყენებენ.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          invite(e.currentTarget);
        }}
        className={`${card} grid items-end gap-3 p-5 sm:grid-cols-[1fr_1fr_1.3fr_auto]`}
      >
        {[
          { name: "first_name", label: "სახელი", required: true },
          { name: "last_name", label: "გვარი", required: false },
          { name: "email", label: "ელ-ფოსტა", required: true, type: "email" },
        ].map((f) => (
          <label key={f.name} className="flex flex-col gap-1 font-semibold">
            {f.label}
            <input name={f.name} type={f.type ?? "text"} required={f.required} aria-invalid={!!fieldErrors[f.name]} className={`${input} font-normal`} />
            {fieldErrors[f.name] && <span className="text-sm font-normal text-[#9a1c1c]">{fieldErrors[f.name]}</span>}
          </label>
        ))}
        <button disabled={busy} className={btn}>მოწვევა</button>
      </form>

      <ErrorNote>{error}</ErrorNote>
      {note && <p role="status" className="font-semibold text-ok">{note}</p>}

      {members && (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr>
                <th className={th}>სახელი</th>
                <th className={th}>ელ-ფოსტა</th>
                <th className={th}>როლი</th>
                <th className={th}>სტატუსი</th>
                <th className={th}><span className="sr-only">მოქმედება</span></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-brand-soft">
                  <td className={td}>{m.name}</td>
                  <td className={td}>{m.email}</td>
                  <td className={td}>{m.role_label}</td>
                  <td className={td}>
                    {!m.is_active ? <Pill color="red">გათიშული</Pill> : m.invited ? <Pill color="yellow">მოწვეულია</Pill> : <Pill color="green">აქტიური</Pill>}
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    <span className="flex flex-wrap justify-end gap-2">
                      {m.is_active && m.invited && (
                        <button type="button" disabled={busy} onClick={() => run(async () => (await api<{ detail: string }>(`org/members/${m.id}/reinvite/`, { method: "POST" })).detail)} className={`${btn2} min-h-9 px-3 text-sm`}>
                          თავიდან გაგზავნა
                        </button>
                      )}
                      {m.role === "manager" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run(async () => {
                            await api(`org/members/${m.id}/active/`, { json: { is_active: !m.is_active } });
                            return m.is_active ? `${m.name}: წვდომა გაითიშა.` : `${m.name}: წვდომა აღდგა.`;
                          })}
                          className={`${btn2} min-h-9 px-3 text-sm`}
                        >
                          {m.is_active ? "გათიშვა" : "ჩართვა"}
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
