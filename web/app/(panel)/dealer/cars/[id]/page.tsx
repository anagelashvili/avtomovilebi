"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CarForm } from "@/components/car-form";
import { ErrorNote } from "@/components/ui";
import { api } from "@/lib/client";
import type { DealerCar } from "@/lib/dealer";

export default function EditCarPage() {
  const { id } = useParams<{ id: string }>();
  const [car, setCar] = useState<DealerCar | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<DealerCar>(`dealer/cars/${id}/`).then(setCar, (e) => setError(e.status === 404 ? "მანქანა ვერ მოიძებნა." : e.message));
  }, [id]);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!car) return <p className="text-muted">იტვირთება…</p>;
  return <CarForm key={car.id} initial={car} />;
}
