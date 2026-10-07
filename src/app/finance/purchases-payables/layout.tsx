import type { ReactNode } from "react";
import { PurchasesSubNav } from "./PurchasesSubNav";

export default function PurchasesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col h-full">
      <PurchasesSubNav />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
