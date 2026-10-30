import React from "react";
import { QuotationsSubNav } from "./QuotationsSubNav";

export default function QuotationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "0 4px" }}>
      <QuotationsSubNav />
      {children}
    </div>
  );
}

