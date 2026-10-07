import type { ReactNode } from "react";
import { AccountingSubNav } from "./AccountingSubNav";

export default function AccountingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col h-full">
      <AccountingSubNav />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
