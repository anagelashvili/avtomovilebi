"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, homeFor, type Me } from "@/lib/client";

const SECTIONS = [
  {
    prefix: "/dealer",
    allowed: (me: Me) => !!me.organization?.is_dealer,
    nav: [
      { href: "/dealer/cars", label: "ჩემი მანქანები" },
      { href: "/dealer/import", label: "Excel-ის ატვირთვა" },
      { href: "/dealer/photos", label: "ფოტოები" },
      { href: "/dealer/cars/new", label: "მანქანის დამატება" },
    ],
  },
  {
    prefix: "/leasing",
    allowed: (me: Me) => !!me.organization?.is_leasing,
    nav: [
      { href: "/leasing", label: "განაცხადები" },
      { href: "/leasing/invoices", label: "ინვოისები" },
    ],
  },
  {
    prefix: "/overview",
    allowed: (me: Me) => me.is_staff,
    nav: [{ href: "/overview", label: "მიმოხილვა" }],
  },
];

export function PanelShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const section = SECTIONS.find((s) => pathname.startsWith(s.prefix)) ?? SECTIONS[0];

  useEffect(() => {
    api<Me>("auth/me/")
      .then((user) => {
        if (!section.allowed(user)) router.replace(homeFor(user));
        else setMe(user);
      })
      .catch((e) => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
      });
  }, [pathname, router, section]);

  async function logout() {
    await api("auth/logout/", { method: "POST" }).catch(() => {});
    router.replace("/login");
  }

  // The page always renders (hidden until the login is confirmed) so Next.js
  // can check its navigation and it isn't mounted twice; the API refuses its
  // data anyway without a valid login.
  return (
    <>
      {me ? <PanelHeader me={me} pathname={pathname} onLogout={logout} /> : (
        <div aria-busy="true" className="flex flex-1 items-center justify-center text-muted">იტვირთება…</div>
      )}
      <main hidden={!me} className="mx-auto w-full max-w-[1240px] flex-1 px-4 pb-12 pt-8 sm:px-6">{children}</main>
    </>
  );
}

function PanelHeader({ me, pathname, onLogout }: { me: Me; pathname: string; onLogout: () => void }) {
  // Dealers and leasing companies may be the same organisation (plan §8).
  const sections = SECTIONS.filter((s) => s.allowed(me));

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-4 py-3.5 sm:px-10 print:hidden">
        <span className="flex items-center gap-2.5">
          <span className="inline-block size-[34px] rounded-md bg-[#ffc800]" aria-hidden="true" />
          <b className="text-[19px]">{me.organization?.name ?? "[საიტის სახელი] · ადმინი"}</b>
        </span>
        <span className="flex items-center gap-4 text-[#4a4560]">
          {me.first_name || me.username}
          <button onClick={onLogout} className="min-h-11 rounded-md px-3 font-semibold text-brand hover:bg-brand-soft">
            გასვლა
          </button>
        </span>
      </header>
      <nav aria-label="პანელის მენიუ" className="border-b border-line bg-white px-4 sm:px-10 print:hidden">
        <ul className="flex flex-wrap gap-x-6">
          {sections.flatMap((s) => s.nav).map((item) => {
            const active =
              item.href === pathname ||
              (item.href !== "/leasing" && item.href !== "/dealer/cars" && pathname.startsWith(item.href)) ||
              (item.href === "/dealer/cars" && /^\/dealer\/cars\/\d+/.test(pathname));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center border-b-2 font-semibold ${active ? "border-brand text-brand" : "border-transparent hover:text-brand"}`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
