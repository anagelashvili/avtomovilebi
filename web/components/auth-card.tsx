import Link from "next/link";
import { Logo } from "./logo";

/** Centered card used by login, password and partner-request pages. */
export function AuthCard({ title, subtitle, children, wide = false }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-page px-4 py-12">
      <div className={`w-full ${wide ? "max-w-xl" : "max-w-sm"}`}>
        <Link href="/" className="mb-6 flex justify-center" aria-label="მთავარი გვერდი">
          <Logo size={28} />
        </Link>
        <div className="rounded-lg border border-line bg-white p-6">
          <h1 className="mb-1 text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mb-5 text-sm text-muted">{subtitle}</p>}
          {children}
        </div>
      </div>
    </main>
  );
}

export const field = "min-h-11 rounded-md border border-field bg-white px-3 font-normal";
export const label = "flex flex-col gap-1 font-semibold";
export const submit = "mt-1 min-h-11 rounded-md bg-brand font-bold text-white hover:bg-brand-dark disabled:opacity-60";
