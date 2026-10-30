import { redirect } from "next/navigation";

export default async function SalesReceivablesSummaryPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ organizationId?: string; locationId?: string }> 
}) {
  const params = await searchParams;
  const search = new URLSearchParams();
  if (params.organizationId) search.set("organizationId", params.organizationId);
  if (params.locationId) search.set("locationId", params.locationId);

  const query = search.toString() ? `?${search.toString()}` : "";
  redirect(`/finance/sales-receivables/customer-balances${query}`);
}

