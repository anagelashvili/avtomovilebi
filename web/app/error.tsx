"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold">რაღაც შეცდომა მოხდა</h1>
        <p className="mt-2 text-muted">გვერდი ვერ ჩაიტვირთა. სცადეთ თავიდან ან დაბრუნდით მთავარ გვერდზე.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <button type="button" onClick={() => retry()} className="inline-flex min-h-11 items-center rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">
            თავიდან ცდა
          </button>
          <Link href="/" className="inline-flex min-h-11 items-center rounded-md border-[1.5px] border-brand px-5 font-semibold text-brand hover:bg-brand-soft">
            მთავარი გვერდი
          </Link>
        </div>
      </div>
    </main>
  );
}
