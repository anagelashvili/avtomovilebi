import type { Metadata } from "next";
import { Suspense } from "react";
import { PanelShell } from "@/components/panel-shell";

export const metadata: Metadata = { robots: { index: false } };

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-page">
      <Suspense>
        <PanelShell>{children}</PanelShell>
      </Suspense>
    </div>
  );
}
