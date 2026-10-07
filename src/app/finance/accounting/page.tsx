import { redirect } from "next/navigation";

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const queryObj: Record<string, string> = {};
  for (const [k, v] of Object.entries(resolvedParams)) {
    if (typeof v === 'string') queryObj[k] = v;
  }
  const query = new URLSearchParams(queryObj).toString();
  redirect(`/finance/accounting/journals${query ? `?${query}` : ""}`);
}
