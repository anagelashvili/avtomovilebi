import type { Metadata } from "next";
import { Pending, TextPage } from "@/components/text-page";

export const metadata: Metadata = { title: "კონფიდენციალურობა" };

export default function PrivacyPage() {
  return (
    <TextPage title="კონფიდენციალურობა">
      <Pending>
        [კონფიდენციალურობის პოლიტიკის ტექსტი იურისტთან შესათანხმებელია (პროექტის გეგმა, პუნქტი 9): რა მონაცემებს ვაგროვებთ, რისთვის, ვის გადაეცემა, რამდენ ხანს ინახება და როგორ შეუძლია ადამიანს მათი წაშლის მოთხოვნა.]
      </Pending>
      <p className="text-muted">
        ტექნიკურად უკვე დაცულია: პირადი ნომერი და ტელეფონი ბაზაში დაშიფრულად ინახება, ლიზინგ კომპანია კლიენტის მონაცემებს ხედავს მხოლოდ კოდის შეყვანის შემდეგ, ყოველი გახსნა და სტატუსის ცვლილება ჩაიწერება.
      </p>
    </TextPage>
  );
}
