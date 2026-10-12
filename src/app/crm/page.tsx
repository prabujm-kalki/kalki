import { redirect } from "next/navigation";

export default async function CRMPage(props: any) {
  const searchParams = await props.searchParams;
  const orgId = searchParams?.organizationId;
  const locId = searchParams?.locationId;
  
  if (orgId && locId) {
    redirect(`/crm/templates?organizationId=${orgId}&locationId=${locId}`);
  } else {
    redirect("/crm/templates");
  }
}
