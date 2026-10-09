import { redirect } from "next/navigation";

export default async function SalesReceivablesPage({ searchParams }: { searchParams: Promise<{ organizationId?: string, locationId?: string }> }) {
  const params = await searchParams;
  const org = params.organizationId ? `?organizationId=${params.organizationId}` : "";
  const loc = params.locationId ? (org ? `&locationId=${params.locationId}` : `?locationId=${params.locationId}`) : "";
  redirect(`/finance/sales-receivables/invoices${org}${loc}`);
}
