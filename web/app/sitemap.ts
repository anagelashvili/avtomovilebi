import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
import { getCars, getCompanies, type CarCard } from "@/lib/api";
import { SITE_URL } from "@/lib/site";

async function allCars() {
  const cars: CarCard[] = [];
  for (let page = 1; page <= 200; page++) {
    const data = await getCars(`page=${page}&sort=new`);
    cars.push(...data.results);
    if (!data.next) break;
  }
  return cars;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("hours");
  const pages = ["", "/cars", "/companies", "/dealers", "/partner", "/faq", "/contact"].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "daily" as const,
  }));
  const companies = (await getCompanies()).map((c) => ({
    url: `${SITE_URL}/companies/${c.code}`,
    changeFrequency: "daily" as const,
  }));
  const cars = (await allCars()).map((car) => ({
    url: `${SITE_URL}/cars/${car.id}`,
    lastModified: car.updated_at,
    images: car.photo ? [car.photo] : undefined,
  }));
  return [...pages, ...companies, ...cars];
}
