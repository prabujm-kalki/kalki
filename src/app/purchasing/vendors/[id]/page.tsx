import { VendorProfile } from "@/components/purchasing/VendorProfile";

export default async function VendorPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  return <VendorProfile vendorId={p.id} />;
}
