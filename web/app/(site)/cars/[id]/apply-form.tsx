"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { gel } from "@/lib/format";
import { keepValues } from "@/lib/forms";
import { submitApplication, type ApplyState } from "./actions";
import { FORM_ID } from "./form-id";

const input = "mt-1.5 min-h-12 w-full rounded-xl border-[1.5px] border-field bg-white px-3.5";

function Field({
  name, label, error, ...props
}: { name: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-[13px] font-bold text-muted">
      {label}
      <input name={name} aria-invalid={!!error} aria-describedby={error ? `${name}-err` : undefined} className={input} {...props} />
      {error && <span id={`${name}-err`} className="mt-1 block text-sm font-normal text-[#9a1c1c]">{error}</span>}
    </label>
  );
}

export function ApplyForm({ carId, carName }: { carId: number; carName: string }) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(submitApplication, { status: "idle" });

  if (state.status === "sent") return <Sent state={state} />;

  const err = state.status === "error" ? state.fields : {};
  const message = state.status === "error" ? state.message ?? err.car ?? err.offer ?? err.non_field_errors : undefined;

  return (
    <form
      id={FORM_ID}
      action={action} // still works before JavaScript loads
      onSubmit={keepValues((data) => startTransition(() => action(data)))}
      className="grid gap-8 rounded-[22px] border border-line bg-white p-6 sm:p-8 lg:grid-cols-[1fr_1.4fr] lg:gap-10"
    >
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">განაცხადი</h2>
        <p className="mt-2 text-muted">
          {carName}. შეთავაზებას ზემოთ ირჩევთ; შეავსეთ ველები და მიიღებთ კოდს, რომლითაც კომპანიაში მიხვალთ.
        </p>
        <p className="mt-4 flex gap-2 text-[13.5px] text-muted">
          <span aria-hidden="true">🔒</span>
          პირადი ნომერი და ტელეფონი დაშიფრულად ინახება. კომპანია მათ ხედავს მხოლოდ თქვენი კოდით.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="car" value={carId} />
        {/* Honeypot: hidden from people, often filled in by bots. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] size-px opacity-0" />
        <Field name="first_name" label="სახელი" required autoComplete="given-name" error={err.first_name} />
        <Field name="last_name" label="გვარი" required autoComplete="family-name" error={err.last_name} />
        <Field name="personal_id" label="პირადი ნომერი" required inputMode="numeric" maxLength={11} placeholder="11 ციფრი" error={err.personal_id} />
        <Field name="phone" label="მობილური" required type="tel" autoComplete="tel" placeholder="555 12 34 56" error={err.phone} />
        <div className="sm:col-span-2">
          <Field name="email" label="ელ-ფოსტა (არასავალდებულო)" type="email" autoComplete="email" error={err.email} />
        </div>
        <label className="flex items-start gap-2.5 text-sm sm:col-span-2">
          <input type="checkbox" name="consent" required className="mt-0.5 size-[18px] flex-none accent-brand" />
          <span>
            ვეთანხმები, რომ ჩემი მონაცემები გადაეცეს არჩეულ ლიზინგ კომპანიას განაცხადის განსახილველად.{" "}
            <Link href="/privacy" className="font-semibold text-brand">წესები</Link>
          </span>
        </label>
        {err.consent && <span className="text-sm text-[#9a1c1c] sm:col-span-2">{err.consent}</span>}
        {message && (
          <p role="alert" className="rounded-xl bg-[#fde0e0] px-3.5 py-2.5 text-sm text-[#9a1c1c] sm:col-span-2">{message}</p>
        )}
        <button
          disabled={pending}
          className="min-h-[52px] rounded-xl bg-cta px-6 text-[17px] font-bold text-ink transition hover:bg-cta-dark disabled:opacity-60 sm:col-span-2 sm:justify-self-end"
        >
          {pending ? "იგზავნება…" : "განაცხადის გაგზავნა →"}
        </button>
      </div>
    </form>
  );
}

function Sent({ state }: { state: Extract<ApplyState, { status: "sent" }> }) {
  return (
    <div role="status" className="flex flex-col gap-4 rounded-[22px] border border-cta bg-sun-soft p-6 sm:p-8">
      <b className="text-lg">განაცხადი გაგზავნილია</b>
      <div>
        <div className="text-muted">თქვენი კოდი:</div>
        <div className="mt-1 inline-block rounded-lg border-2 border-dashed border-cta bg-white px-5 py-3 text-[34px] font-bold tracking-[2px]">
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
            <span className="flex size-8 flex-none items-center justify-center rounded-full bg-cta font-bold">{i + 1}</span>
            {t}
          </li>
        ))}
      </ol>
      <div className="text-sm">
        {state.car} · {state.company} · {gel(state.monthly_gel)}/თვე · {state.term_months} თვე
      </div>
      <Link href="/my" className="text-sm font-semibold text-brand">განაცხადის სტატუსის ნახვა →</Link>
    </div>
  );
}
