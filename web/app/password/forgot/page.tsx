"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthCard, field, label, submit } from "@/components/auth-card";
import { ErrorNote } from "@/components/ui";
import { api } from "@/lib/client";
import { keepValues } from "@/lib/forms";

export default function ForgotPasswordPage() {
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function send(form: FormData) {
    setPending(true);
    setError("");
    try {
      const r = await api<{ detail: string }>("auth/password/forgot/", { json: { email: form.get("email") } });
      setDone(r.detail);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard title="პაროლის აღდგენა" subtitle="მიუთითეთ ელ-ფოსტა და გამოგიგზავნით ბმულს ახალი პაროლის დასაყენებლად.">
      {done ? (
        <p role="status" className="rounded-md bg-ok-soft px-3 py-2 text-ok">{done}</p>
      ) : (
        <form onSubmit={keepValues(send)} className="flex flex-col gap-3">
          <label className={label}>
            ელ-ფოსტა
            <input name="email" type="email" required autoComplete="email" className={field} />
          </label>
          <ErrorNote>{error}</ErrorNote>
          <button disabled={pending} className={submit}>{pending ? "იგზავნება…" : "ბმულის გაგზავნა"}</button>
        </form>
      )}
      <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-brand">← შესვლა</Link>
    </AuthCard>
  );
}
