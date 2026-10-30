import { getInvoiceSettings } from "./actions";
import { InvoiceSettingsClient } from "./InvoiceSettingsClient";

export default async function InvoiceSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ organizationId?: string; locationId?: string }>;
}) {
  const resolvedParams = await searchParams;
  const orgId = resolvedParams.organizationId || "";
  const settings = await getInvoiceSettings(orgId);

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", width: "100%", padding: "20px 24px 60px 24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a", margin: "0 0 6px 0" }}>
          Invoice Template & Print Configuration
        </h1>
        <p style={{ color: "#64748b", margin: 0, fontSize: "13.5px" }}>
          Select industry-standard invoice templates (Classic Corporate, Modern Minimal, Thermal Compact), customize colors, toggle statutory columns, and set bank details.
        </p>
      </div>

      <InvoiceSettingsClient orgId={orgId} initialSettings={settings} />
    </div>
  );
}
