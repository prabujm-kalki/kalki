import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { AssetsClient } from "@/components/accounts/AssetsClient";

export const metadata = {
  title: "Fixed Assets | Kalki BOS",
};

export default async function AssetsPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  
  if (!session?.user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        Authentication required.
      </div>
    );
  }

  return <AssetsClient />;
}
