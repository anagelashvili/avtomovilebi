import Link from "next/link";
import { Logo } from "./logo";

const COLUMNS = [
  {
    title: "მანქანები",
    links: [
      { href: "/cars", label: "ყველა მანქანა" },
      { href: "/cars?fuel=electric", label: "ელექტრო მანქანები" },
      { href: "/cars?body=suv", label: "ჯიპები და კროსოვერები" },
      { href: "/cars?sort=new", label: "ახალი განცხადებები" },
    ],
  },
  {
    title: "სერვისი",
    links: [
      { href: "/my", label: "ჩემი განაცხადები" },
      { href: "/companies", label: "ლიზინგ კომპანიები" },
      { href: "/#how", label: "როგორ მუშაობს" },
      { href: "/dealers", label: "დილერებისთვის" },
      { href: "/faq", label: "FAQ" },
    ],
  },
];

const SOCIAL = [
  {
    label: "Facebook",
    icon: <path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V10H6v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h2z" />,
  },
  {
    label: "Instagram",
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" />
      </>
    ),
  },
  {
    label: "LinkedIn",
    icon: (
      <>
        <rect x="3" y="9" width="4" height="12" />
        <circle cx="5" cy="4.5" r="2" />
        <path d="M11 21V9h4v2a4 4 0 0 1 7 3v7h-4v-6a2 2 0 0 0-4 0v6z" />
      </>
    ),
  },
];

const linkClass = "text-footer-text hover:text-white";

export function SiteFooter() {
  return (
    <footer className="bg-footer text-footer-text">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-8 px-6 pb-8 pt-12">
        <div className="flex flex-col gap-3.5">
          <Link href="/" className="flex min-h-11 items-center" aria-label="მთავარი გვერდი">
            <Logo size={24} dark />
          </Link>
          <p className="leading-relaxed">
            მანქანები ლიზინგით — შეადარე ლიზინგ კომპანიების შეთავაზებები ერთ ადგილას.
          </p>
          <div className="flex gap-2.5">
            {SOCIAL.map((s) => (
              <a
                key={s.label}
                href="#"
                aria-label={s.label}
                className="inline-flex size-11 items-center justify-center rounded-full border border-[#2c4a62] hover:text-white"
              >
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {s.icon}
                </svg>
              </a>
            ))}
          </div>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className="flex flex-col gap-2.5">
            <b className="mb-1 text-base text-white">{col.title}</b>
            {col.links.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass}>
                {l.label}
              </Link>
            ))}
          </nav>
        ))}
        <div className="flex flex-col gap-2.5">
          <b className="mb-1 text-base text-white">კონტაქტი</b>
          <span>[ტელეფონი]</span>
          <span>[ელ-ფოსტა]</span>
          <span>[მისამართი]</span>
          <span>[სამუშაო საათები]</span>
        </div>
      </div>
      <div className="border-t border-[#23435b]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-3 px-6 py-[18px] text-sm">
          <span>© 2026 avtomobilebi.ge. ყველა უფლება დაცულია.</span>
          <div className="flex flex-wrap gap-5">
            <Link href="/privacy" className={linkClass}>კონფიდენციალურობა</Link>
            <Link href="/terms" className={linkClass}>წესები და პირობები</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
