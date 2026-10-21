import type { Metadata } from "next";
import { MyApplications } from "./my-applications";

export const metadata: Metadata = { title: "ჩემი განაცხადები", robots: { index: false } };

export default function MyPage() {
  return (
    <div className="mx-auto max-w-[860px] px-6 pb-14 pt-8">
      <h1 className="mb-1 text-[28px] font-bold">ჩემი განაცხადები</h1>
      <p className="mb-6 text-muted">ნახეთ, რა ეტაპზეა თქვენი განაცხადი. რეგისტრაცია არ არის საჭირო.</p>
      <MyApplications />
    </div>
  );
}
