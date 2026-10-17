import { redirect } from "next/navigation";

export default async function PurchasingPage(props: {
  searchParams?: Promise<Record<string, string>>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const qs = new URLSearchParams(searchParams).toString();
  redirect(`/purchasing/dashboard${qs ? `?${qs}` : ""}`);
}
