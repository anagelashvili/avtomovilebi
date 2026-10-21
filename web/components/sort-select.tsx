"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "./select";

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
    <Select
      inline
      label="დალაგება:"
      labelClassName="text-muted"
      className="w-[260px] max-w-full"
      options={SORTS}
      value={value}
      onChange={(v) => {
        const q = new URLSearchParams(searchParams);
        q.set("sort", v);
        q.delete("page");
        router.push(`${pathname}?${q}`);
      }}
    />
  );
}
