import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { TaxClient } from "@/components/accounts/TaxClient";

export const metadata = {
  title: "Tax & Compliance | Kalki BOS",
};

export default async function TaxPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  
  if (!session?.user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        Authentication required.
      </div>
    );
  }

  return <TaxClient />;
}
