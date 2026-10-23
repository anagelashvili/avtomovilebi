"use client";

import Link from "next/link";
import { useState } from "react";
import { gel } from "@/lib/format";

/** Budget steps for the slider (₾ a month). */
export const BUDGETS = [200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000, 3000, 5000];

/** "How much can you pay a month?" — a slider over BUDGETS that counts the
 * cars that fit (from each car's lowest monthly payment) and links to them. */
export function BudgetPicker({ monthly, initial = 800, compact = false }: { monthly: number[]; initial?: number; compact?: boolean }) {
  const [index, setIndex] = useState(Math.max(0, BUDGETS.indexOf(initial)));
  const budget = BUDGETS[index];
  const count = monthly.filter((m) => m <= budget).length;
  const fill = (index / (BUDGETS.length - 1)) * 100;

  return (
    <div className={`rounded-[18px] bg-white shadow-[0_18px_44px_rgba(15,42,61,.10)] ${compact ? "p-5" : "p-6 sm:p-7"}`}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="budget" className="text-[13px] font-bold text-muted">ყოველთვიური გადასახადი</label>
        <span>
          <b className="text-[30px] font-extrabold tracking-tight text-brand sm:text-[34px]">{gel(budget)}</b>
          <span className="text-muted">-მდე</span>
        </span>
      </div>
      <input
        id="budget"
        type="range"
        min={0}
        max={BUDGETS.length - 1}
        step={1}
        value={index}
        onChange={(e) => setIndex(Number(e.target.value))}
        aria-valuetext={`${gel(budget)}-მდე თვეში`}
        className="range mt-5 block w-full"
        style={{ "--fill": `${fill}%` } as React.CSSProperties}
      />
      <div className="mt-1 flex justify-between text-[12.5px] text-muted">
        <span>{gel(BUDGETS[0])}</span>
        <span>{gel(BUDGETS[BUDGETS.length - 1])}+</span>
      </div>
      <Link
        href={`/cars?monthly_max=${budget}&sort=monthly`}
        className="mt-6 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-cta px-5 text-center text-[16px] font-bold text-ink transition hover:-translate-y-px hover:bg-cta-dark"
      >
        {count ? `ნახეთ ${count} მანქანა, რომელიც ბიუჯეტში ეტევა →` : "ამ ბიუჯეტით მანქანა ჯერ არ არის — გაზარდეთ"}
      </Link>
    </div>
  );
}

/** The catalog filter's version: a slider that fills a monthly_max form
 * field. The last step means "any budget". */
export function MonthlyRange({ defaultValue }: { defaultValue: string }) {
  const steps = [...BUDGETS, 0]; // 0 = any
  // A budget between steps (e.g. 750) snaps to the next step up.
  const wanted = Number(defaultValue) || 0;
  const start = wanted ? BUDGETS.findIndex((b) => b >= wanted) : -1;
  const [index, setIndex] = useState(start === -1 ? steps.length - 1 : start);
  const value = steps[index];
  const fill = (index / (steps.length - 1)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor="monthly-range" className="text-[13px] font-bold text-muted">თვეში</label>
        <b className="text-[22px] font-extrabold text-brand">{value ? `${gel(value)}-მდე` : "ნებისმიერი"}</b>
      </div>
      <input
        id="monthly-range"
        type="range"
        min={0}
        max={steps.length - 1}
        value={index}
        onChange={(e) => setIndex(Number(e.target.value))}
        aria-valuetext={value ? `${gel(value)}-მდე თვეში` : "ნებისმიერი"}
        className="range mt-3.5 block w-full"
        style={{ "--fill": `${fill}%` } as React.CSSProperties}
      />
      <input type="hidden" name="monthly_max" value={value || ""} />
    </div>
  );
}
