import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { AccountsDashboardClient } from "@/components/accounts/DashboardClient";

export const metadata = {
  title: "Accounts Dashboard | Kalki BOS",
};

export default async function AccountsDashboardPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  
  if (!session?.user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        Authentication required.
      </div>
    );
  }

  return <AccountsDashboardClient />;
}
