import { redirect } from "next/navigation";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams(params).toString();
  const queryString = qs ? `?${qs}` : "";

  redirect(`/settings/organization${queryString}`);
}
