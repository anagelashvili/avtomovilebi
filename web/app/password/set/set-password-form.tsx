"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { field, label, submit } from "@/components/auth-card";
import { ErrorNote } from "@/components/ui";
import { api, ApiError } from "@/lib/client";
import { keepValues } from "@/lib/forms";

/** The page behind invite and password-reset emails. */
export function SetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";
  const [error, setError] = useState("");
  const [badLink, setBadLink] = useState(!uid || !token);
  const [pending, setPending] = useState(false);

  async function save(form: FormData) {
    setError("");
    const password = String(form.get("password") ?? "");
    if (password !== form.get("password2")) {
      setError("პაროლები ერთმანეთს არ ემთხვევა.");
      return;
    }
    setPending(true);
    try {
      const r = await api<{ username: string }>("auth/password/set/", { json: { uid, token, password } });
      router.replace(`/login?password=set&user=${encodeURIComponent(r.username)}`);
    } catch (e) {
      if (e instanceof ApiError && e.data && typeof e.data === "object" && "detail" in e.data) setBadLink(true);
      setError((e as Error).message);
      setPending(false);
    }
  }

  if (badLink) {
    return (
      <div className="flex flex-col gap-3">
        <ErrorNote>{error || "ბმული არასწორია ან ვადა გაუვიდა."}</ErrorNote>
        <Link href="/password/forgot" className="font-semibold text-brand">ახალი ბმულის მოთხოვნა</Link>
      </div>
    );
  }

  return (
    <form onSubmit={keepValues(save)} className="flex flex-col gap-3">
      <label className={label}>
        ახალი პაროლი
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={field} />
      </label>
      <label className={label}>
        გაიმეორეთ პაროლი
        <input name="password2" type="password" required minLength={8} autoComplete="new-password" className={field} />
      </label>
      <ErrorNote>{error}</ErrorNote>
      <button disabled={pending} className={submit}>{pending ? "ინახება…" : "პაროლის დაყენება"}</button>
    </form>
  );
}
