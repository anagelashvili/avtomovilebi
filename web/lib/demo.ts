import data from "@/demo/data.json";
import type { CarDetail, CarPage, Company, Filters } from "./api";

// A saved copy of the API's public data (scripts/snapshot-demo.mjs), used
// while the site runs without the API. Filters, sorting and pages work the
// same way as the API's /api/public/cars/.

type DemoCar = CarDetail & { seller: string; offer_companies: string[] };

const cars = data.cars as DemoCar[];
const PAGE_SIZE = 12;

const SORTS: Record<string, (a: DemoCar, b: DemoCar) => number> = {
  new: (a, b) => b.updated_at.localeCompare(a.updated_at),
  price: (a, b) => a.price_gel - b.price_gel,
  price_desc: (a, b) => b.price_gel - a.price_gel,
  monthly: (a, b) => a.monthly_from - b.monthly_from,
};

function int(value: string | null) {
  return value && /^\d+$/.test(value) ? Number(value) : null;
}

export function demoCars(query: string): CarPage {
  const q = new URLSearchParams(query);
  let list = cars;
  const make = q.get("make")?.toLowerCase();
  if (make) list = list.filter((c) => c.make.toLowerCase() === make);
  if (q.get("body")) list = list.filter((c) => c.body === q.get("body"));
  const fuels = q.getAll("fuel").filter(Boolean);
  if (fuels.length) list = list.filter((c) => fuels.includes(c.fuel));
  const ranges: [string, (c: DemoCar) => number, 1 | -1][] = [
    ["price_min", (c) => c.price_gel, 1], ["price_max", (c) => c.price_gel, -1],
    ["year_min", (c) => c.year, 1], ["year_max", (c) => c.year, -1],
    ["monthly_max", (c) => c.monthly_from, -1],
  ];
  for (const [param, value, dir] of ranges) {
    const limit = int(q.get(param));
    if (limit !== null) list = list.filter((c) => (dir === 1 ? value(c) >= limit : value(c) <= limit));
  }
  const company = q.get("company");
  if (company) list = list.filter((c) => c.offer_companies.includes(company));
  const seller = q.get("seller");
  if (seller) list = list.filter((c) => c.seller === seller);
  const sort = SORTS[q.get("sort") ?? ""] ?? SORTS.new;
  list = [...list].sort((a, b) => sort(a, b) || a.id - b.id);

  const page = Math.max(1, int(q.get("page")) ?? 1);
  const results = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return {
    count: list.length,
    next: page * PAGE_SIZE < list.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results,
  };
}

export function demoCar(id: string): CarDetail | null {
  return cars.find((c) => String(c.id) === id) ?? null;
}

export const demoCompanies = data.companies as Company[];
export const demoFilters = data.filters as Filters;
