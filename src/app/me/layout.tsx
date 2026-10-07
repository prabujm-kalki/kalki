import { AppShell } from "@/components/AppShell";

export default function MeLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <div className="kalki-main-content">
        {children}
      </div>
    </AppShell>
  );
}
