export type AppRow = {
  id: number;
  code: string;
  first_name: string;
  last_name: string;
  phone: string;
  car: string;
  created_at: string;
  status: string;
  status_label: string;
  opened: boolean;
};

export type AppDetail = {
  code: string;
  status: string;
  status_label: string;
  next_statuses: { value: string; label: string }[];
  first_name: string;
  last_name: string;
  personal_id: string;
  phone: string;
  email: string;
  car: string;
  car_price_gel: number;
  car_external_id: string;
  dealer: string;
  term_months: number;
  down_payment_gel: number;
  monthly_gel: number;
  contract_number: string;
  created_at: string;
  opened_at: string | null;
  signed_at: string | null;
  history: { from: string; to: string; user: string; note: string; at: string }[];
};

export type InvoiceRow = {
  id: number;
  company: string;
  month: string;
  amount_gel: string;
  status: string;
  status_label: string;
  deals: number;
};

export type InvoiceDetail = InvoiceRow & {
  bank_details: string;
  items: { code: string; contract_number: string; car: string; signed_at: string; amount_gel: string }[];
};

export function dateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const MONTHS = ["იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი", "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"];

/** "2026-09" → "სექტემბერი 2026" */
export function monthName(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function money(amount: string | number) {
  const [whole, cents] = Number(amount).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return cents === "00" ? `${grouped} ლ` : `${grouped}.${cents} ლ`;
}
