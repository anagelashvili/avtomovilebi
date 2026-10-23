import Link from "next/link";
import { Logo } from "./logo";

const NAV = [
  { href: "/cars", label: "მანქანები" },
  { href: "/companies", label: "ლიზინგ კომპანიები" },
  { href: "/#how", label: "როგორ მუშაობს" },
  // In the footer too; shown here only where the header has room.
  { href: "/dealers", label: "დილერებისთვის", wide: true },
];

function LockIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="11" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-8 px-4 py-2 sm:px-8 lg:h-[72px] lg:flex-nowrap lg:py-0">
        <Link href="/" className="flex min-h-11 items-center" aria-label="მთავარი გვერდი">
          <Logo size={23} />
        </Link>
        {/* Phones: one scrollable line under the logo row. Desktop: next to the logo. */}
        <nav
          aria-label="მთავარი მენიუ"
          className="order-last -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 [scrollbar-width:none] lg:order-none lg:mx-0 lg:w-auto lg:px-0"
        >
          <ul className="flex gap-x-7 whitespace-nowrap text-[15px] font-semibold">
            {NAV.map((item) => (
              <li key={item.href} className={"wide" in item ? "lg:max-xl:hidden" : undefined}>
                <Link href={item.href} className="inline-flex min-h-11 items-center hover:text-brand">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-4 whitespace-nowrap">
          <Link
            href="/my"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border-[1.5px] border-field px-3.5 text-[15px] font-semibold hover:border-brand hover:text-brand"
          >
            <LockIcon />
            <span className="max-sm:sr-only">ჩემი განაცხადები</span>
          </Link>
          <Link href="/login" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-muted hover:text-brand">
            <span className="max-sm:hidden">პარტნიორის შესვლა</span>
            <span className="sm:hidden">შესვლა</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
