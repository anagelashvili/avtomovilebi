import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="max-w-md text-center">
          <div className="text-6xl font-extrabold text-brand">404</div>
          <h1 className="mt-3 text-2xl font-bold">გვერდი ვერ მოიძებნა</h1>
          <p className="mt-2 text-muted">შესაძლოა მანქანა უკვე გაიყიდა ან ბმული შეცდომითაა აკრეფილი.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Link href="/cars" className="inline-flex min-h-11 items-center rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">
              მანქანების ნახვა
            </Link>
            <Link href="/" className="inline-flex min-h-11 items-center rounded-md border-[1.5px] border-brand px-5 font-semibold text-brand hover:bg-brand-soft">
              მთავარი გვერდი
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
