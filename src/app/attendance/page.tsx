import { redirect } from "next/navigation";
import { getSessionContext } from "@/domains/session/service";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return redirect("/login");

  const context = await getSessionContext(session.user);
  const scope = context.scopes[0];
  const permissions = scope?.permissions || [];
  
  // Checking isOwner from user metadata or role if available, but checking the specific permission is safer.
  const isOwner = (session.user as any).isOwner || (session.user as any).role === "owner" || (session.user as any).role === "admin";
  const canViewRecords = isOwner || permissions.includes("attendance.records:read");

  const params = await searchParams;
  const qs = new URLSearchParams(params).toString();
  const queryString = qs ? `?${qs}` : "";

  if (canViewRecords) {
    redirect(`/attendance/overview${queryString}`);
  } else {
    redirect(`/attendance/my-time${queryString}`);
  }
}
