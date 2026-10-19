"use client";

import Link from "next/link";
import { useActionState } from "react";
import { gel } from "@/lib/format";
import { submitApplication, type ApplyState } from "./actions";
import { FORM_ID } from "./form-id";

const input = "mt-1 min-h-11 w-full rounded-md border border-field bg-white px-3";

function Field({
  name, label, error, ...props
}: { name: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      {label}
      <input name={name} aria-invalid={!!error} aria-describedby={error ? `${name}-err` : undefined} className={input} {...props} />
      {error && <span id={`${name}-err`} className="mt-1 block text-sm text-[#9a1c1c]">{error}</span>}
    </label>
  );
}

export function ApplyForm({ carId }: { carId: number }) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(submitApplication, { status: "idle" });

  if (state.status === "sent") return <Sent state={state} />;

  const err = state.status === "error" ? state.fields : {};
  const message = state.status === "error" ? state.message ?? err.car ?? err.offer ?? err.non_field_errors : undefined;

  return (
    <form id={FORM_ID} action={action} className="flex flex-col gap-2.5 rounded-lg border border-line bg-white p-5">
      <b className="text-[17px]">გაგზავნე განაცხადი</b>
      <p className="text-sm text-muted">აირჩიეთ შეთავაზება ცხრილში და შეავსეთ ფორმა.</p>
      <input type="hidden" name="car" value={carId} />
      {/* Honeypot: hidden from people, often filled in by bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] size-px opacity-0" />
      <Field name="first_name" label="სახელი" required autoComplete="given-name" error={err.first_name} />
      <Field name="last_name" label="გვარი" required autoComplete="family-name" error={err.last_name} />
      <Field name="personal_id" label="პირადი ნომერი" required inputMode="numeric" maxLength={11} error={err.personal_id} />
      <Field name="phone" label="ტელეფონი" required type="tel" autoComplete="tel" placeholder="5XX XX XX XX" error={err.phone} />
      <Field name="email" label="ელ-ფოსტა (არასავალდებულო)" type="email" autoComplete="email" error={err.email} />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" required className="mt-1 size-4 accent-brand" />
        <span>
          ვეთანხმები, რომ ჩემი მონაცემები გადაეცეს არჩეულ ლიზინგ კომპანიას განაცხადის განსახილველად.{" "}
          <Link href="/privacy" className="font-semibold text-brand">წესები</Link>
        </span>
      </label>
      {err.consent && <span className="text-sm text-[#9a1c1c]">{err.consent}</span>}
      {message && (
        <p role="alert" className="rounded-md bg-[#fde0e0] px-3 py-2 text-sm text-[#9a1c1c]">{message}</p>
      )}
      <button disabled={pending} className="min-h-11 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark disabled:opacity-60">
        {pending ? "იგზავნება…" : "განაცხადის გაგზავნა"}
      </button>
    </form>
  );
}

function Sent({ state }: { state: Extract<ApplyState, { status: "sent" }> }) {
  return (
    <div role="status" className="flex flex-col gap-4 rounded-lg border border-[#ffc800] bg-[#fff9de] p-5">
      <b className="text-lg">განაცხადი გაგზავნილია</b>
      <div>
        <div className="text-muted">თქვენი კოდი:</div>
        <div className="mt-1 inline-block rounded-lg border-2 border-dashed border-[#ffc800] bg-white px-5 py-3 text-[34px] font-bold tracking-[2px]">
          {state.code}
        </div>
      </div>
      <ol className="flex flex-col gap-2.5">
        {[
          `კოდი SMS-ით${state.email_sent ? " და მეილზე" : ""} გამოგიგზავნეთ.`,
          `მიდით ${state.company}-ში${state.company_address ? ` (${state.company_address})` : ""}.`,
          "დაასახელეთ კოდი. განაცხადს თავიდან აღარ შეავსებთ.",
        ].map((t, i) => (
          <li key={t} className="flex items-center gap-3">
            <span className="flex size-8 flex-none items-center justify-center rounded-full bg-[#ffc800] font-bold">{i + 1}</span>
            {t}
          </li>
        ))}
      </ol>
      <div className="text-sm">
        {state.car} · {state.company} · {gel(state.monthly_gel)}/თვე · {state.term_months} თვე
      </div>
    </div>
  );
}
