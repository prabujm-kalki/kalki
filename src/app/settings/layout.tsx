import { AppShell } from "@/components/AppShell";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SettingsNav } from "./SettingsNav";



export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <AppShell>
      <div className="kalki-module-layout">
        <SettingsNav />
        <main className="kalki-module-content">
          {children}
        </main>
      </div>
    </AppShell>
  );
}
