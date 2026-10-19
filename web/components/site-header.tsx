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
    <header className="flex flex-wrap items-center justify-between gap-x-6 border-b border-line bg-white px-4 py-2.5 sm:px-8 lg:flex-nowrap">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="inline-block size-9 rounded-lg bg-sun" aria-hidden="true" />
        <b className="text-lg">[ლოგო]</b>
      </Link>
      {/* Phones: one scrollable line under the logo row. Desktop: in the middle. */}
      <nav
        aria-label="მთავარი მენიუ"
        className="order-last -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 [scrollbar-width:none] lg:order-none lg:mx-0 lg:w-auto lg:px-0"
      >
        <ul className="flex gap-x-6 whitespace-nowrap text-[15px] font-semibold">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="inline-flex min-h-11 items-center hover:text-brand">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Link
        href="/login"
        className="flex min-h-11 items-center gap-2 rounded-full bg-brand-soft py-1 pl-1 pr-4 text-[15px] font-bold hover:bg-brand-tint"
      >
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-brand-tint">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="#6a1bd1">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
          </svg>
        </span>
        შესვლა
      </Link>
    </header>
  );
}
