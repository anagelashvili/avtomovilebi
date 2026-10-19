"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const SORTS = [
  { value: "new", label: "ახალი" },
  { value: "monthly", label: "თვიური გადასახდელი" },
  { value: "price", label: "ფასი: ზრდადობით" },
  { value: "price_desc", label: "ფასი: კლებადობით" },
];

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className="flex items-center gap-2">
      <span className="text-muted">დალაგება:</span>
      <select
        value={value}
        onChange={(e) => {
          const q = new URLSearchParams(searchParams);
          q.set("sort", e.target.value);
          q.delete("page");
          router.push(`${pathname}?${q}`);
        }}
        className="min-h-11 rounded-md border border-field bg-white px-3"
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </label>
  );
}
