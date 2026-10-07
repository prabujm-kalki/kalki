import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { LedgerClient } from "@/components/accounts/LedgerClient";

export const metadata = {
  title: "Sub-Ledgers | Kalki BOS",
};

export default async function LedgersPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  
  if (!session?.user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        Authentication required.
      </div>
    );
  }

  return <LedgerClient />;
}
