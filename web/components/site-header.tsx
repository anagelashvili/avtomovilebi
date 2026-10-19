import Link from "next/link";

const NAV = [
  { href: "/cars", label: "მანქანები" },
  { href: "/companies", label: "ლიზინგ კომპანიები" },
  { href: "/#how", label: "როგორ მუშაობს" },
  { href: "/contact", label: "კონტაქტი" },
  { href: "/faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-b border-line bg-white px-4 py-4 sm:px-12 sm:py-[22px]">
      <Link href="/" className="flex items-center gap-3.5">
        <span className="inline-block size-12 rounded-xl bg-sun sm:size-14" aria-hidden="true" />
        <b className="text-[22px]">[ლოგო]</b>
      </Link>
      <nav aria-label="მთავარი მენიუ" className="flex flex-wrap gap-x-9 gap-y-3 text-[17px] font-semibold">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="hover:text-brand">
            {item.label}
          </Link>
        ))}
      </nav>
      <Link
        href="/login"
        className="flex min-h-[52px] items-center gap-2.5 rounded-full bg-brand-soft py-2 pl-2 pr-6 text-[17px] font-bold hover:bg-brand-tint"
      >
        <span className="inline-flex size-10 items-center justify-center rounded-full bg-brand-tint">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="#6a1bd1">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
          </svg>
        </span>
        შესვლა
      </Link>
    </header>
  );
}
