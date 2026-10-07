import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ChartOfAccountsClient } from "@/components/accounts/ChartOfAccountsClient";

export const metadata = {
  title: "Chart of Accounts | Kalki BOS",
};

export default async function ChartOfAccountsPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  
  if (!session?.user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        Authentication required.
      </div>
    );
  }

  return <ChartOfAccountsClient />;
}
