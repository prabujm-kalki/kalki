import React from "react";
import { getEvents, getEventConfigurations } from "./actions";
import EventsClient, { EventItemData } from "./EventsClient";
import { HallConfig, CateringComboConfig } from "@/app/settings/events/EventsSettingsClient";

export const dynamic = "force-dynamic";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ organizationId?: string; locationId?: string }>;
}) {
  const { organizationId, locationId } = await searchParams;

  let eventList: EventItemData[] = [];
  let halls: HallConfig[] = [];
  let combos: CateringComboConfig[] = [];

  if (organizationId && locationId) {
    const rawEvents = await getEvents(organizationId, locationId);
    eventList = rawEvents.map((r) => ({
      id: r.event.id,
      title: r.event.title,
      functionType: r.event.functionType,
      eventDate: r.event.eventDate.toISOString(),
      timeSlot: r.event.timeSlot,
      guaranteedPax: r.event.guaranteedPax,
      expectedPax: r.event.expectedPax,
      pricePerPax: r.event.pricePerPax,
      hallRent: r.event.hallRent,
      status: r.event.status,
      contactName: r.event.contactName,
      contactPhone: r.event.contactPhone,
      contactEmail: r.event.contactEmail,
      specialInstructions: r.event.specialInstructions,
      notes: r.event.notes,
      hallId: r.event.hallId,
      comboId: r.event.comboId,
      customerId: r.event.customerId,
      hallName: r.hall?.hallName || null,
      comboName: r.combo?.name || null,
      financials: r.financials
        ? {
            id: r.financials.id,
            totalFoodCost: r.financials.totalFoodCost,
            hallRentAmount: r.financials.hallRentAmount,
            discountAmount: r.financials.discountAmount,
            grandTotal: r.financials.grandTotal,
            advancePaid: r.financials.advancePaid,
            balanceDue: r.financials.balanceDue,
            paymentStatus: r.financials.paymentStatus,
            invoiceId: r.financials.invoiceId,
          }
        : null,
    }));

    const config = await getEventConfigurations(organizationId, locationId);
    halls = config.halls.map((h) => ({
      id: h.id,
      hallName: h.hallName,
      capacity: h.capacity,
      baseRent: h.baseRent,
      cleaningFee: h.cleaningFee,
      cautionDeposit: h.cautionDeposit,
      timeSlots: Array.isArray(h.timeSlots) ? (h.timeSlots as string[]) : [],
      functionTypes: Array.isArray(h.functionTypes) ? (h.functionTypes as string[]) : [],
    }));

    combos = config.combos.map((c) => ({
      id: c.id,
      name: c.name,
      mealType: c.mealType,
      description: c.description,
      menuItems: Array.isArray(c.menuItems) ? (c.menuItems as string[]) : [],
      basePricePerPax: c.basePricePerPax,
    }));
  }

  return (
    <div className="kalki-main-content" style={{ padding: "1.5rem" }}>
      <EventsClient
        initialEvents={eventList}
        halls={halls}
        combos={combos}
      />
    </div>
  );
}
