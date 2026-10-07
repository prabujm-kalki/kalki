import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { BankingClient } from "@/components/accounts/BankingClient";

export const metadata = {
  title: "Bank & Cash Operations | Kalki BOS",
};

export default async function BankingPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  
  if (!session?.user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        Authentication required.
      </div>
    );
  }

  return <BankingClient />;
}
