// Saves the public data of a running API (cars, companies, filters) into
// demo/data.json, and the photos and logos it uses into public/demo/, so the
// site can run without the API (see DEMO in lib/api.ts).
//
//   node scripts/snapshot-demo.mjs            # API at http://127.0.0.1:8000
//   API_URL=https://… node scripts/snapshot-demo.mjs
//
// Photos are copied from ../api/media, so run it next to the API's media folder.

import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API = process.env.API_URL ?? "http://127.0.0.1:8000";
const WEB = join(dirname(fileURLToPath(import.meta.url)), "..");
const MEDIA = join(WEB, "..", "api", "media");

async function get(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

async function allCars(query = "") {
  const ids = [];
  for (let page = 1; ; page++) {
    const data = await get(`/api/public/cars/?${query}&page=${page}`);
    ids.push(...data.results.map((c) => c.id));
    if (!data.next) return ids;
  }
}

// API media URL → copied file under public/demo/media, served at /demo/media/…
function local(url) {
  if (!url) return url;
  const path = new URL(url).pathname.replace(/^\/media\//, "");
  const to = join(WEB, "public", "demo", "media", path);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(join(MEDIA, path), to);
  return `/demo/media/${path}`;
}

const filters = await get("/api/public/filters/");
const companies = (await get("/api/public/companies/")).map((c) => ({ ...c, logo: local(c.logo) }));

const cars = [];
for (const id of await allCars()) {
  const car = await get(`/api/public/cars/${id}/`);
  car.photo = local(car.photo);
  car.photos = car.photos.map(local);
  cars.push({ ...car, seller: "", offer_companies: [] });
}
// Which company sells each car and which give offers on it (the public API
// only shows names, the filters use codes).
const byId = new Map(cars.map((c) => [c.id, c]));
for (const { code } of companies) {
  for (const id of await allCars(`seller=${code}`)) byId.get(id).seller = code;
  for (const id of await allCars(`company=${code}`)) byId.get(id).offer_companies.push(code);
}

mkdirSync(join(WEB, "demo"), { recursive: true });
writeFileSync(join(WEB, "demo", "data.json"), JSON.stringify({ filters, companies, cars }, null, 1) + "\n");
console.log(`Saved ${cars.length} cars and ${companies.length} companies.`);
