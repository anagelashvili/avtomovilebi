// Dealer panel types and the fixed choices (same values as api/core/models.py Car).

export type Photo = { id: number; image: string; position: number };

export type DealerCar = {
  id: number;
  external_id: string;
  make: string;
  model: string;
  year: number;
  body: string;
  fuel: string;
  engine: string;
  transmission: string;
  mileage_km: number;
  price_gel: number;
  city: string;
  description: string;
  status: "draft" | "active" | "archived";
  photos: Photo[];
  updated_at: string;
};

export const FUELS = [
  { value: "petrol", label: "ბენზინი" },
  { value: "diesel", label: "დიზელი" },
  { value: "hybrid", label: "ჰიბრიდი" },
  { value: "electric", label: "ელექტრო" },
  { value: "gas", label: "გაზი" },
];
export const TRANSMISSIONS = [
  { value: "automatic", label: "ავტომატური" },
  { value: "manual", label: "მექანიკური" },
];
export const BODIES = [
  { value: "sedan", label: "სედანი" },
  { value: "suv", label: "ჯიპი / SUV" },
  { value: "hatchback", label: "ჰეჩბეკი" },
  { value: "wagon", label: "უნივერსალი" },
  { value: "coupe", label: "კუპე" },
  { value: "minivan", label: "მინივენი" },
  { value: "pickup", label: "პიკაპი" },
];
export const CAR_STATUS: Record<DealerCar["status"], string> = {
  draft: "დრაფტი",
  active: "აქტიური",
  archived: "დაარქივებული",
};

export function carName(car: Pick<DealerCar, "make" | "model" | "year">) {
  return `${car.make} ${car.model} ${car.year}`;
}

export function shortDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}
