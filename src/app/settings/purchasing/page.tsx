import React from "react";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { headers } from "next/headers";
import { getBranchPurchasePolicy, getSpotPurchaseItems } from "@/app/purchasing/actions";
import { PurchasingSettingsClient } from "./PurchasingSettingsClient";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function PurchasingSettingsPage(props: {
  searchParams?: Promise<{ organizationId?: string; locationId?: string }>;
}) {
  await requireAuthenticatedUser(new Request("https://localhost", { headers: await headers() }));
  const searchParams = props.searchParams ? await props.searchParams : {};
  
  // Resolve organization and location
  const allLocations = await db
    .select({
      id: locations.id,
      name: locations.name,
      organizationId: locations.organizationId,
    })
    .from(locations)
    .where(eq(locations.isActive, true));

  const targetLocation = searchParams?.locationId 
    ? allLocations.find(l => l.id === searchParams.locationId) || allLocations[0]
    : allLocations[0];

  const organizationId = searchParams?.organizationId || targetLocation?.organizationId || "";
  const locationId = targetLocation?.id || "";

  if (!organizationId || !locationId) {
    return (
      <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
        <h2>No Location Context Found</h2>
        <p className="text-muted">Please select an active branch or location to configure Quick Purchase settings.</p>
      </div>
    );
  }

  const { businessRoles } = await import("@/db/schema");
  const [policy, itemsList, rolesList] = await Promise.all([
    getBranchPurchasePolicy(organizationId, locationId),
    getSpotPurchaseItems(organizationId, locationId),
    db
      .select({
        id: businessRoles.id,
        name: businessRoles.name,
        identifier: businessRoles.identifier,
      })
      .from(businessRoles)
      .where(and(eq(businessRoles.organizationId, organizationId), eq(businessRoles.isActive, true)))
      .orderBy(businessRoles.name),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="kalki-page-header" style={{ marginBottom: "0.5rem" }}>
        <h1 className="kalki-page-title" style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0 }}>
          Quick Purchase & Micro-Procurement Settings ⚡
        </h1>
        <p className="kalki-page-description" style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
          Configure Ex-Ante transaction guardrails, daily branch spending caps, and item-level spot purchase eligibility matrix.
        </p>
      </div>

      <PurchasingSettingsClient
        organizationId={organizationId}
        locationId={locationId}
        locations={allLocations}
        initialPolicy={policy}
        initialItems={itemsList}
        roles={rolesList}
      />
    </div>
  );
}
