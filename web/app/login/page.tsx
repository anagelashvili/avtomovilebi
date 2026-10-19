import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "შესვლა" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-page px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center gap-3">
          <span className="inline-block size-12 rounded-xl bg-sun" aria-hidden="true" />
          <b className="text-[22px]">[ლოგო]</b>
        </Link>
        <div className="rounded-lg border border-line bg-white p-6">
          <h1 className="mb-1 text-2xl font-bold">შესვლა</h1>
          <p className="mb-5 text-sm text-muted">დილერებისა და ლიზინგ კომპანიებისთვის.</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
