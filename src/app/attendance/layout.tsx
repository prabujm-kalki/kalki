import { AppShell } from "@/components/AppShell";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AttendanceNav } from "./AttendanceNav";
import "./attendance.css";

export default async function AttendanceLayout({
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
      <div className="att-layout">
        <AttendanceNav />
        <main className="att-content">
          {children}
        </main>
      </div>
    </AppShell>
  );
}
