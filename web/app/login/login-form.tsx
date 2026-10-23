"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api, homeFor, type Me } from "@/lib/client";
import { keepValues } from "@/lib/forms";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(form: FormData) {
    setPending(true);
    setError("");
    try {
      const me = await api<Me>("auth/login/", {
        json: { username: form.get("username"), password: form.get("password") },
      });
      // Only follow local paths, never another site.
      router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : homeFor(me));
    } catch (e) {
      setError((e as Error).message);
      setPending(false);
    }
  }

  return (
    <form onSubmit={keepValues(submit)} className="flex flex-col gap-3">
      {params.get("password") === "set" && (
        <p role="status" className="rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">პაროლი დაყენებულია. შედით ახალი პაროლით.</p>
      )}
      <label className="flex flex-col gap-1 font-semibold">
        ელ-ფოსტა ან მომხმარებელი
        <input name="username" required autoComplete="username" defaultValue={params.get("user") ?? ""} className="min-h-11 rounded-md border border-field px-3 font-normal" />
      </label>
      <label className="flex flex-col gap-1 font-semibold">
        პაროლი
        <input name="password" type="password" required autoComplete="current-password" className="min-h-11 rounded-md border border-field px-3 font-normal" />
      </label>
      {error && <p role="alert" className="rounded-md bg-[#fde0e0] px-3 py-2 text-sm text-[#9a1c1c]">{error}</p>}
      <button disabled={pending} className="mt-1 min-h-11 rounded-md bg-brand font-bold text-white hover:bg-brand-dark disabled:opacity-60">
        {pending ? "შესვლა…" : "შესვლა"}
      </button>
    </form>
  );
}
