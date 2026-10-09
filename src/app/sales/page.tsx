import { redirect } from "next/navigation";

export default async function Page({ searchParams }: { searchParams: Promise<any> }) {
  const params = await searchParams;
  const orgId = params.organizationId;
  const locId = params.locationId;
  let q = "";
  if (orgId && locId) {
    q = `?organizationId=${orgId}&locationId=${locId}`;
  } else if (orgId) {
    q = `?organizationId=${orgId}`;
  }
  redirect(`/sales/overview${q}`);
}
