import type { Metadata } from "next";
import { Noto_Sans_Georgian } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const georgian = Noto_Sans_Georgian({
  variable: "--font-georgian",
  subsets: ["georgian", "latin"],
  weight: ["400", "600", "700", "800"],
});

const description = "მანქანები ლიზინგით — შეადარე ლიზინგ კომპანიების შეთავაზებები ერთ ადგილას.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "avtomobilebi.ge · მანქანები ლიზინგით",
    template: "%s · avtomobilebi.ge",
  },
  description,
  openGraph: {
    type: "website",
    siteName: "avtomobilebi.ge",
    locale: "ka_GE",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ka" className={`${georgian.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans text-[15px]">{children}</body>
    </html>
  );
}
