import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "შესვლა" };

export default function LoginPage() {
  return (
    <AuthCard title="შესვლა" subtitle="დილერებისა და ლიზინგ კომპანიებისთვის.">
      <Suspense>
        <LoginForm />
      </Suspense>
      <div className="mt-4 flex flex-col gap-2 text-sm">
        <Link href="/password/forgot" className="font-semibold text-brand">დაგავიწყდათ პაროლი?</Link>
        <p className="text-muted">
          ჯერ არ ხართ პარტნიორი?{" "}
          <Link href="/partner" className="font-semibold text-brand">გახდით პარტნიორი</Link>
        </p>
      </div>
    </AuthCard>
  );
}
