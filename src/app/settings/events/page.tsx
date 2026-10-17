import React from "react";
import { db } from "@/db";
import { eventConfigurations, cateringCombos, comboPricingTiers } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import EventsSettingsClient, { HallConfig, CateringComboConfig, PricingTierConfig } from "./EventsSettingsClient";

export const dynamic = "force-dynamic";

export default async function EventsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ organizationId?: string; locationId?: string }>;
}) {
  const { organizationId, locationId } = await searchParams;

  let halls: HallConfig[] = [];
  let combos: CateringComboConfig[] = [];
  let tiers: PricingTierConfig[] = [];

  if (organizationId && locationId) {
    const rawHalls = await db
      .select()
      .from(eventConfigurations)
      .where(
        and(
          eq(eventConfigurations.organizationId, organizationId),
          eq(eventConfigurations.locationId, locationId)
        )
      )
      .orderBy(desc(eventConfigurations.createdAt));

    halls = rawHalls.map((h) => ({
      id: h.id,
      hallName: h.hallName,
      capacity: h.capacity,
      baseRent: h.baseRent,
      cleaningFee: h.cleaningFee,
      cautionDeposit: h.cautionDeposit,
      timeSlots: Array.isArray(h.timeSlots) ? (h.timeSlots as string[]) : [],
      functionTypes: Array.isArray(h.functionTypes) ? (h.functionTypes as string[]) : [],
    }));

    const rawCombos = await db
      .select()
      .from(cateringCombos)
      .where(
        and(
          eq(cateringCombos.organizationId, organizationId),
          eq(cateringCombos.locationId, locationId)
        )
      )
      .orderBy(desc(cateringCombos.createdAt));

    combos = rawCombos.map((c) => ({
      id: c.id,
      name: c.name,
      mealType: c.mealType,
      description: c.description,
      menuItems: Array.isArray(c.menuItems) ? (c.menuItems as string[]) : [],
      basePricePerPax: c.basePricePerPax,
    }));

    const rawTiers = await db
      .select()
      .from(comboPricingTiers)
      .orderBy(comboPricingTiers.minPax);

    tiers = rawTiers.map((t) => ({
      id: t.id,
      comboId: t.comboId,
      minPax: t.minPax,
      maxPax: t.maxPax,
      pricePerPax: t.pricePerPax,
    }));
  }

  return (
    <div style={{ padding: "0.5rem" }}>
      <div className="kalki-page-header" style={{ marginBottom: "1.5rem" }}>
        <h1 className="kalki-page-title" style={{ fontSize: "1.6rem", fontWeight: 700 }}>
          Events & Catering Configuration
        </h1>
        <p className="kalki-page-description" style={{ color: "#71717a", fontSize: "0.9rem", marginTop: "0.25rem" }}>
          Define banquet halls, time slots, function types, and tiered volume pricing matrices for catering packages.
        </p>
      </div>

      <EventsSettingsClient
        initialHalls={halls}
        initialCombos={combos}
        initialTiers={tiers}
      />
    </div>
  );
}
