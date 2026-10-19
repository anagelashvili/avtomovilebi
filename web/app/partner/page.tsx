import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { PartnerForm } from "./partner-form";

export const metadata: Metadata = {
  title: "გახდით პარტნიორი",
  description: "დილერებისა და ლიზინგ კომპანიებისთვის: განათავსეთ მანქანები და შეთავაზებები avtomobilebi.ge-ზე.",
};

export default function PartnerPage() {
  return (
    <AuthCard
      wide
      title="გახდით პარტნიორი"
      subtitle="შეავსეთ ფორმა. ჩვენი გუნდი დაგიკავშირდებათ, და ხელშეკრულების შემდეგ ელ-ფოსტაზე მიიღებთ ბმულს ანგარიშის გასააქტიურებლად."
    >
      <PartnerForm />
    </AuthCard>
  );
}
