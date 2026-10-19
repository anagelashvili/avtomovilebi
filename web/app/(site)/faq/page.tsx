import type { Metadata } from "next";
import Link from "next/link";
import { Pending, TextPage } from "@/components/text-page";

export const metadata: Metadata = { title: "ხშირად დასმული კითხვები" };

// Answers follow the process in the project plan; add more as questions come in.
const QA = [
  {
    q: "როგორ მუშაობს საიტი?",
    a: "აირჩიეთ მანქანა, შეადარეთ ლიზინგ კომპანიების შეთავაზებები და გააგზავნეთ ერთი განაცხადი. მიიღებთ კოდს, რომელსაც კომპანიაში მისვლისას დაასახელებთ.",
  },
  {
    q: "რა არის განაცხადის კოდი?",
    a: "კოდი (მაგ. GL-48213) გამოგეგზავნებათ SMS-ით და მეილზე. კომპანიაში მისვლისას მენეჯერი კოდს შეიყვანს და თქვენს განაცხადს თავიდან აღარ შეავსებთ.",
  },
  {
    q: "ვინ ხედავს ჩემს მონაცემებს?",
    a: "მხოლოდ თქვენ მიერ არჩეული ლიზინგ კომპანია და მხოლოდ მას შემდეგ, რაც მენეჯერი თქვენს კოდს შეიყვანს. მანამდე კომპანია ხედავს მხოლოდ სახელს და გვარს.",
  },
  {
    q: "რა ხდება, როცა კომპანია ჩემს განაცხადს გახსნის?",
    a: "მოგივათ SMS. თუ განაცხადი თქვენ არ გაგიხსნიათ, დაგვიკავშირდით.",
  },
  {
    q: "ვინ წყვეტს, დამიმტკიცდება თუ არა ლიზინგი?",
    a: "გადაწყვეტილებას იღებს ლიზინგ კომპანია. საიტი გეხმარებათ შეთავაზებების შედარებასა და განაცხადის გაგზავნაში.",
  },
];

export default function FaqPage() {
  return (
    <TextPage title="ხშირად დასმული კითხვები">
      {QA.map(({ q, a }) => (
        <details key={q} className="group rounded-md border border-line px-4 py-3 open:bg-page">
          <summary className="cursor-pointer font-bold">{q}</summary>
          <p className="mt-2">{a}</p>
        </details>
      ))}
      <Pending>[დამატებითი კითხვები: საკომისიო, ვადები, საჭირო დოკუმენტები — ბიზნესის მიერ შესავსები]</Pending>
      <p>
        ვერ იპოვეთ პასუხი? <Link href="/contact" className="font-semibold text-brand">დაგვიკავშირდით</Link>.
      </p>
    </TextPage>
  );
}
