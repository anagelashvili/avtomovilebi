import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = { title: "პაროლის დაყენება", robots: { index: false } };

export default function SetPasswordPage() {
  return (
    <AuthCard title="პაროლის დაყენება" subtitle="მინიმუმ 8 სიმბოლო. არ გამოიყენოთ მარტივი ან მხოლოდ ციფრებისგან შემდგარი პაროლი.">
      <Suspense>
        <SetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
