import { getQuotationSettings } from "./actions";
import { QuotationSettingsClient } from "./QuotationSettingsClient";

export default async function QuotationSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ organizationId?: string; locationId?: string }>;
}) {
  const resolvedParams = await searchParams;
  const orgId = resolvedParams.organizationId || "";
  const settings = await getQuotationSettings(orgId);

  return (
    <div style={{ maxWidth: "850px", margin: "0 auto", width: "100%", paddingBottom: "60px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a", margin: "0 0 6px 0" }}>
          Quotation & Proforma Configuration
        </h1>
        <p style={{ color: "#64748b", margin: 0, fontSize: "13.5px" }}>
          Configure default quotation notes, terms & conditions, payment terms, and validity periods across your organization.
        </p>
      </div>

      <QuotationSettingsClient orgId={orgId} initialSettings={settings} />
    </div>
  );
}

