import type { Metadata } from "next";
import Link from "next/link";
import { TextPage } from "@/components/text-page";

export const metadata: Metadata = { title: "დილერებისთვის" };

export default function DealersPage() {
  return (
    <TextPage title="დილერებისთვის">
      <p>განათავსეთ თქვენი მანქანები და მყიდველები ნახავენ ლიზინგის შეთავაზებებს სხვადასხვა კომპანიიდან.</p>
      <ol className="flex list-decimal flex-col gap-2 pl-5">
        <li>ყოველ დილით მიიღებთ მეილს Excel-ის შაბლონით.</li>
        <li>ატვირთეთ შევსებული Excel. სისტემა შეამოწმებს ფაილს და გაჩვენებთ შეცდომებს სტრიქონების მიხედვით.</li>
        <li>დაამატეთ ფოტოები თითოეულ მანქანას. პირველი ფოტო მთავარია.</li>
        <li>ფოტოიანი მანქანები გამოჩნდება საიტზე.</li>
      </ol>
      <div className="flex flex-wrap gap-2.5">
        <Link href="/partner" className="inline-flex min-h-11 items-center rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">გახდით პარტნიორი</Link>
        <Link href="/login" className="inline-flex min-h-11 items-center rounded-md border-[1.5px] border-brand px-5 font-semibold text-brand">უკვე პარტნიორი ხართ? შესვლა</Link>
      </div>
    </TextPage>
  );
}
