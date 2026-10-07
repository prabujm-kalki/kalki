import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { JournalsClient } from "@/components/accounts/JournalsClient";

export const metadata = {
  title: "Manual Journals | Kalki BOS",
};

export default async function JournalsPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  
  if (!session?.user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        Authentication required.
      </div>
    );
  }

  return <JournalsClient />;
}
