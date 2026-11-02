import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { BranchAnalyticsClient } from "@/components/accounts/BranchAnalyticsClient";

export const metadata = {
  title: "Branch Unit Economics & Intelligence | Kalki BOS",
};

export default async function BranchAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  const params = await searchParams;
  
  if (!session?.user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        Authentication required.
      </div>
    );
  }

  return <BranchAnalyticsClient initialOrgId={params?.organizationId} />;
}
