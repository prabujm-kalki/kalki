import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ReportsClient } from "@/components/accounts/ReportsClient";

export const metadata = {
  title: "Financial Statements | Kalki BOS",
};

export default async function ReportsPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  
  if (!session?.user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        Authentication required.
      </div>
    );
  }

  return <ReportsClient />;
}
