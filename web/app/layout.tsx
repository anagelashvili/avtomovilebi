import type { Metadata } from "next";
import { Noto_Sans_Georgian } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const georgian = Noto_Sans_Georgian({
  variable: "--font-georgian",
  subsets: ["georgian", "latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "avtomobilebi.ge · მანქანები ლიზინგით",
    template: "%s · avtomobilebi.ge",
  },
  description: "მანქანები ლიზინგით — შეადარე ლიზინგ კომპანიების შეთავაზებები ერთ ადგილას.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ka" className={`${georgian.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans text-[15px]">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
