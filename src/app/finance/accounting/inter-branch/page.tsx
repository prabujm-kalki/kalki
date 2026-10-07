import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { InterBranchClient } from "@/components/accounts/InterBranchClient";

export const metadata = {
  title: "Inter-Branch Clearing | Kalki BOS",
};

export default async function InterBranchPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  
  if (!session?.user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        Authentication required.
      </div>
    );
  }

  return <InterBranchClient />;
}
