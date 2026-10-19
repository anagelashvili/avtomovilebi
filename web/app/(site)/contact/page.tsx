import type { Metadata } from "next";
import { TextPage } from "@/components/text-page";

export const metadata: Metadata = { title: "კონტაქტი" };

export default function ContactPage() {
  return (
    <TextPage title="კონტაქტი">
      <dl className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <dt className="text-muted">ტელეფონი</dt><dd className="font-semibold">[ტელეფონი]</dd>
        <dt className="text-muted">ელ-ფოსტა</dt><dd className="font-semibold">[ელ-ფოსტა]</dd>
        <dt className="text-muted">მისამართი</dt><dd className="font-semibold">[მისამართი]</dd>
        <dt className="text-muted">სამუშაო საათები</dt><dd className="font-semibold">[სამუშაო საათები]</dd>
      </dl>
      <p>განაცხადთან დაკავშირებით კითხვისას მიუთითეთ თქვენი განაცხადის კოდი (მაგ. GL-48213).</p>
    </TextPage>
  );
}
