import Link from "next/link";

/** Simple content page with the site's breadcrumb and card look. */
export function TextPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[860px] px-6 pb-14 pt-6">
      <nav aria-label="breadcrumb" className="mb-2 text-muted">
        <Link href="/" className="hover:text-brand">მთავარი</Link> / {title}
      </nav>
      <h1 className="mb-5 text-[28px] font-bold">{title}</h1>
      <div className="flex flex-col gap-4 rounded-lg border border-line bg-white p-6 leading-relaxed">{children}</div>
    </div>
  );
}

/** Marks text that the business still has to supply. */
export function Pending({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md bg-sun-soft px-4 py-3 text-sun-ink">{children}</p>;
}
