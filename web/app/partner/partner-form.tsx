"use client";

import Link from "next/link";
import { useState } from "react";
import { field, label, submit } from "@/components/auth-card";
import { ErrorNote } from "@/components/ui";
import { api, ApiError } from "@/lib/client";
import { keepValues } from "@/lib/forms";

const FIELDS = [
  { name: "company_name", label: "კომპანიის სახელი", autoComplete: "organization" },
  { name: "tax_id", label: "საიდენტიფიკაციო კოდი", inputMode: "numeric" as const, maxLength: 11 },
  { name: "contact_name", label: "საკონტაქტო პირი", autoComplete: "name" },
  { name: "phone", label: "ტელეფონი", type: "tel", autoComplete: "tel" },
  { name: "email", label: "ელ-ფოსტა", type: "email", autoComplete: "email" },
];

export function PartnerForm() {
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function send(form: FormData) {
    setPending(true);
    setErrors({});
    setMessage("");
    try {
      await api("public/partner-requests/", { json: Object.fromEntries(form) });
      setSent(true);
    } catch (e) {
      if (e instanceof ApiError && e.data && typeof e.data === "object" && !("detail" in e.data)) {
        const fieldErrors: Record<string, string> = {};
        for (const [k, v] of Object.entries(e.data)) fieldErrors[k] = [v].flat().join(" ");
        setErrors(fieldErrors);
      } else {
        setMessage((e as Error).message);
      }
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-3">
        <p role="status" className="rounded-md bg-ok-soft px-3 py-2 text-ok">
          მოთხოვნა გაიგზავნა. ჩვენი გუნდი მალე დაგიკავშირდებათ.
        </p>
        <Link href="/" className="font-semibold text-brand">← მთავარი გვერდი</Link>
      </div>
    );
  }

  return (
    <form onSubmit={keepValues(send)} className="flex flex-col gap-3">
      {/* Honeypot: hidden from people, often filled in by bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] size-px opacity-0" />
      <fieldset>
        <legend className="mb-2 font-semibold">ვინ ხართ?</legend>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "dealer", label: "დილერი" },
            { value: "leasing", label: "ლიზინგ კომპანია" },
            { value: "both", label: "ორივე" },
          ].map((k, i) => (
            <label key={k.value} className="cursor-pointer">
              <input type="radio" name="kind" value={k.value} defaultChecked={i === 0} className="peer sr-only" />
              <span className="inline-flex min-h-11 items-center rounded-full px-4 font-semibold ring-1 ring-line peer-checked:bg-brand peer-checked:text-white peer-checked:ring-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
                {k.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map(({ name, label: text, ...props }) => (
          <label key={name} className={label}>
            {text}
            <input name={name} required aria-invalid={!!errors[name]} className={field} {...props} />
            {errors[name] && <span className="text-sm font-normal text-[#9a1c1c]">{errors[name]}</span>}
          </label>
        ))}
      </div>
      <label className={label}>
        შეტყობინება (არასავალდებულო)
        <textarea name="message" rows={3} className={`${field} py-2`} placeholder="მაგ. რამდენი მანქანა გაქვთ, რომელ ქალაქში ხართ" />
      </label>
      <ErrorNote>{message}</ErrorNote>
      <button disabled={pending} className={submit}>{pending ? "იგზავნება…" : "მოთხოვნის გაგზავნა"}</button>
    </form>
  );
}
