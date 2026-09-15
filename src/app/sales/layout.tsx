import { AppShell } from "@/components/AppShell";
import type { ReactNode } from "react";

export default function SalesLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
