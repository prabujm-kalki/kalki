import type { ReactNode } from "react";
import { SalesSubNav } from "./SalesSubNav";

export default function SalesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col h-full">
      <SalesSubNav />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
