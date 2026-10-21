import { cacheLife, cacheTag } from "next/cache";

// Server-side only: the Django API's base URL.
export const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

export type CarCard = {
  id: number;
  make: string;
  model: string;
  year: number;
  body: string;
  fuel: string;
  fuel_label: string;
  engine: string;
  transmission_label: string;
  mileage_km: number;
  price_gel: number;
  city: string;
  updated_at: string;
  photo: string | null;
  monthly_from: number;
  companies: string[];
};

export type Offer = {
  id: number;
  company: string;
  term_months: number;
  down_payment_gel: number;
  monthly_gel: number;
};

export type CarDetail = CarCard & {
  body_label: string;
  description: string;
  photos: string[];
  /** Author and licence of the main photo, when its licence asks for credit. */
  photo_credit: string;
  offers: Offer[];
};

export type Option = { value: string; label: string };
export type Filters = {
  makes: string[];
  bodies: Option[];
  fuels: Option[];
  companies: Option[];
};

export type CarPage = { count: number; next: string | null; previous: string | null; results: CarCard[] };

async function getJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_URL}${path}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

/** `query` is a ready query string such as "make=BMW&page=2". */
export async function getCars(query = ""): Promise<CarPage> {
  "use cache";
  cacheLife("minutes");
  cacheTag("cars");
  return (await getJson<CarPage>(`/api/public/cars/?${query}`))!;
}

export async function getCar(id: string): Promise<CarDetail | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("cars", `car:${id}`);
  if (!/^\d+$/.test(id)) return null;
  return getJson<CarDetail>(`/api/public/cars/${id}/`);
}

export type Company = {
  code: string;
  name: string;
  logo: string | null;
  is_leasing: boolean;
  is_dealer: boolean;
  /** Cars the company sells itself. */
  cars_count: number;
  /** Leasing offers it gives on cars on the site. */
  offers_count: number;
  phone: string;
  email: string;
  address: string;
};

export async function getCompanies(): Promise<Company[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("companies");
  return (await getJson<Company[]>("/api/public/companies/"))!;
}

export async function getCompany(code: string): Promise<Company | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("companies", `company:${code}`);
  if (!/^[\w-]+$/.test(code)) return null;
  return getJson<Company>(`/api/public/companies/${code}/`);
}

export async function getFilters(): Promise<Filters> {
  "use cache";
  cacheLife("hours");
  cacheTag("filters");
  return (await getJson<Filters>("/api/public/filters/"))!;
}
