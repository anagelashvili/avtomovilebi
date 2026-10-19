"use server";

import { API_URL } from "@/lib/api";

export type ApplyState =
  | { status: "idle" }
  | { status: "error"; message?: string; fields: Record<string, string> }
  | {
      status: "sent";
      code: string;
      car: string;
      company: string;
      company_address: string;
      monthly_gel: number;
      term_months: number;
      email_sent: boolean;
    };

const FIELDS = ["car", "offer", "first_name", "last_name", "personal_id", "phone", "email"] as const;

export async function submitApplication(_prev: ApplyState, form: FormData): Promise<ApplyState> {
  const body: Record<string, unknown> = Object.fromEntries(
    FIELDS.map((f) => [f, String(form.get(f) ?? "").trim()]),
  );
  body.consent = form.get("consent") === "on";
  if (!body.offer) {
    return { status: "error", fields: { offer: "აირჩიეთ ლიზინგის შეთავაზება." } };
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/public/applications/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return { status: "error", message: "კავშირი ვერ დამყარდა. სცადეთ თავიდან.", fields: {} };
  }

  const data = await res.json().catch(() => ({}));
  if (res.status === 201) return { status: "sent", ...data };
  if (res.status === 400) {
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries(data)) fields[k] = [v].flat().join(" ");
    return { status: "error", fields };
  }
  return { status: "error", message: "განაცხადი ვერ გაიგზავნა. სცადეთ თავიდან.", fields: {} };
}
