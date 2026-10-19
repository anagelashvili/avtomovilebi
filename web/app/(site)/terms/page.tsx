import type { Metadata } from "next";
import { Pending, TextPage } from "@/components/text-page";

export const metadata: Metadata = { title: "წესები და პირობები" };

export default function TermsPage() {
  return (
    <TextPage title="წესები და პირობები">
      <Pending>[საიტის გამოყენების წესები და პირობები — იურისტთან შესათანხმებელი ტექსტი.]</Pending>
    </TextPage>
  );
}
