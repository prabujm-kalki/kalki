"use client";

import React, { useState, useMemo } from "react";
import { useSessionView } from "@/components/AppShell";
import {
  upsertEvent,
  updateEventStatus,
  generateEventSalesInvoice,
} from "./actions";
import { HallConfig, CateringComboConfig } from "@/app/settings/events/EventsSettingsClient";
import { AudienceSelectorModal, DisplayItem } from "@/components/crm/AudienceSelectorModal";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Send,
  CheckCircle2,
  FileText,
  Megaphone,
  CheckSquare,
  Square,
  Receipt,
} from "lucide-react";

export interface EventItemData {
  id: string;
  title: string;
  functionType: string;
  eventDate: string;
  timeSlot: string;
  guaranteedPax: number;
  expectedPax: number;
  pricePerPax: string | number;
  hallRent: string | number;
  status: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string | null;
  specialInstructions?: string | null;
  notes?: string | null;
  hallId?: string | null;
  comboId?: string | null;
  customerId?: string | null;
  hallName?: string | null;
  comboName?: string | null;
  financials?: {
    id: string;
    totalFoodCost: string | number;
    hallRentAmount: string | number;
    discountAmount: string | number;
    grandTotal: string | number;
    advancePaid: string | number;
    balanceDue: string | number;
    paymentStatus: string;
    invoiceId?: string | null;
  } | null;
}

interface Props {
  initialEvents: EventItemData[];
  halls: HallConfig[];
  combos: CateringComboConfig[];
}

// 7 STRICT COLOR CODES
// Yellow (Enquiry), Orange (Likely), Blue (Confirmed/No Advance), Green (Booked/Paid),
// Gray (At Risk), Red (Cancelled), Pink (Completed/Payment Pending)
const STATUS_COLORS: Record<
  string,
  { label: string; bg: string; text: string; border: string; badge: string }
> = {
  ENQUIRY: {
    label: "Enquiry",
    bg: "#fef9c3",
    text: "#854d0e",
    border: "#fde047",
    badge: "Yellow",
  },
  LIKELY: {
    label: "Likely",
    bg: "#ffedd5",
    text: "#9a3412",
    border: "#fdba74",
    badge: "Orange",
  },
  CONFIRMED_NO_ADVANCE: {
    label: "Confirmed (No Advance)",
    bg: "#dbeafe",
    text: "#1e40af",
    border: "#93c5fd",
    badge: "Blue",
  },
  BOOKED_PAID: {
    label: "Booked (Paid / Advance)",
    bg: "#dcfce7",
    text: "#166534",
    border: "#86efac",
    badge: "Green",
  },
  AT_RISK: {
    label: "At Risk",
    bg: "#f4f4f5",
    text: "#52525b",
    border: "#d4d4d8",
    badge: "Gray",
  },
  CANCELLED: {
    label: "Cancelled",
    bg: "#fee2e2",
    text: "#991b1b",
    border: "#fca5a5",
    badge: "Red",
  },
  COMPLETED_PENDING: {
    label: "Completed (Payment Pending)",
    bg: "#fce7f3",
    text: "#9d174d",
    border: "#fbcfe8",
    badge: "Pink",
  },
};

export default function EventsClient({ initialEvents, halls, combos }: Props) {
  const { selected, session } = useSessionView();
  const [eventList, setEventList] = useState<EventItemData[]>(initialEvents);

  // Month navigation (Defaults to current calendar month)
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // View state
  const [selectedEventDetail, setSelectedEventDetail] = useState<EventItemData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItemData | null>(null);

  // Marketing audience modal state
  const [marketingModalOpen, setMarketingModalOpen] = useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());

  // ESCAPE KEY SHORTCUT (Requirement 2): Close all modals and drawers on ESC
  useEscapeKey(() => setModalOpen(false), modalOpen);
  useEscapeKey(() => setSelectedEventDetail(null), !!selectedEventDetail && !modalOpen);
  useEscapeKey(() => setMarketingModalOpen(false), marketingModalOpen);

  // Dynamic Time Slots & Function Types from configured halls or sensible defaults
  const availableTimeSlots = useMemo(() => {
    const slots = new Set<string>(["MORNING", "EVENING", "FULL_DAY"]);
    halls.forEach((h) => {
      if (Array.isArray(h.timeSlots)) {
        h.timeSlots.forEach((s) => slots.add(s));
      }
    });
    return Array.from(slots);
  }, [halls]);

  const availableFunctionTypes = useMemo(() => {
    const types = new Set<string>([
      "WEDDING",
      "RECEPTION",
      "BIRTHDAY",
      "CORPORATE",
      "ANNIVERSARY",
      "GET_TOGETHER",
    ]);
    halls.forEach((h) => {
      if (Array.isArray(h.functionTypes)) {
        h.functionTypes.forEach((f) => types.add(f));
      }
    });
    return Array.from(types);
  }, [halls]);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formFunctionType, setFormFunctionType] = useState("WEDDING");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formTimeSlot, setFormTimeSlot] = useState("MORNING");
  const [formPax, setFormPax] = useState(100);
  const [formExpectedPax, setFormExpectedPax] = useState(120);
  const [formHallId, setFormHallId] = useState<string>("");
  const [formComboId, setFormComboId] = useState<string>("");
  const [formPricePerPax, setFormPricePerPax] = useState<number>(0);
  const [formHallRent, setFormHallRent] = useState<number>(0);
  const [formAdvance, setFormAdvance] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<string>("ENQUIRY");
  const [formContactName, setFormContactName] = useState("");
  const [formContactPhone, setFormContactPhone] = useState("");
  const [formContactEmail, setFormContactEmail] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
  const daysInMonth = lastDayOfMonth.getDate();

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Map events to day number
  // Auto-Hide: If the event is completed and event_financials shows ₹0 balance due, remove it from the active visual calendar.
  const eventsByDay = useMemo(() => {
    const map = new Map<number, EventItemData[]>();
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    for (const ev of eventList) {
      const isCompletedFullyPaid =
        (ev.status === "COMPLETED" || ev.status === "COMPLETED_PENDING") &&
        Number(ev.financials?.balanceDue || 0) <= 0;

      if (isCompletedFullyPaid) {
        continue; // Auto-hide from active visual calendar
      }

      const d = new Date(ev.eventDate);
      if (d.getFullYear() === y && d.getMonth() === m) {
        const day = d.getDate();
        const current = map.get(day) || [];
        current.push(ev);
        map.set(day, current);
      }
    }
    return map;
  }, [eventList, currentDate]);

  // Targetable customers for Marketing Handoff
  const uniqueEventCustomers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; phone: string; eventsCount: number }>();
    for (const ev of eventList) {
      if (ev.customerId) {
        const existing = map.get(ev.customerId);
        if (existing) {
          existing.eventsCount += 1;
        } else {
          map.set(ev.customerId, {
            id: ev.customerId,
            name: ev.contactName,
            phone: ev.contactPhone,
            eventsCount: 1,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [eventList]);

  const toggleCustomerSelection = (id: string) => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllCustomers = () => {
    if (selectedCustomerIds.size === uniqueEventCustomers.length) {
      setSelectedCustomerIds(new Set());
    } else {
      setSelectedCustomerIds(new Set(uniqueEventCustomers.map((c) => c.id)));
    }
  };

  // Convert selected customers for GlobalTemplateModal displayData
  const displayAudienceItems: DisplayItem[] = useMemo(() => {
    return uniqueEventCustomers
      .filter((c) => selectedCustomerIds.has(c.id))
      .map((c) => ({
        id: c.id,
        name: c.name,
        contact: c.phone,
        totalOrders: c.eventsCount,
        avgBillValue: 25000,
      }));
  }, [uniqueEventCustomers, selectedCustomerIds]);

  const openNewEventModal = (dateStr?: string) => {
    setEditingEvent(null);
    setFormTitle("");
    setFormFunctionType("WEDDING");
    setFormDate(dateStr || new Date().toISOString().slice(0, 10));
    setFormTimeSlot("MORNING");
    setFormPax(100);
    setFormExpectedPax(120);
    setFormHallId(halls[0]?.id || "");
    setFormComboId(combos[0]?.id || "");
    setFormPricePerPax(combos[0] ? Number(combos[0].basePricePerPax) : 350);
    setFormHallRent(halls[0] ? Number(halls[0].baseRent) : 15000);
    setFormAdvance(0);
    setFormStatus("ENQUIRY");
    setFormContactName("");
    setFormContactPhone("");
    setFormContactEmail("");
    setFormNotes("");
    setModalOpen(true);
  };

  const openEditEventModal = (ev: EventItemData) => {
    setEditingEvent(ev);
    setFormTitle(ev.title);
    setFormFunctionType(ev.functionType);
    setFormDate(ev.eventDate.slice(0, 10));
    setFormTimeSlot(ev.timeSlot);
    setFormPax(ev.guaranteedPax);
    setFormExpectedPax(ev.expectedPax);
    setFormHallId(ev.hallId || "");
    setFormComboId(ev.comboId || "");
    setFormPricePerPax(Number(ev.pricePerPax));
    setFormHallRent(Number(ev.hallRent));
    setFormAdvance(ev.financials ? Number(ev.financials.advancePaid) : 0);
    setFormStatus(ev.status);
    setFormContactName(ev.contactName);
    setFormContactPhone(ev.contactPhone);
    setFormContactEmail(ev.contactEmail || "");
    setFormNotes(ev.notes || "");
    setModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected?.organizationId || !selected?.locationId) {
      alert("Please select organization & location");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await upsertEvent({
        id: editingEvent?.id,
        organizationId: selected.organizationId,
        locationId: selected.locationId,
        title: formTitle,
        functionType: formFunctionType,
        eventDate: formDate,
        timeSlot: formTimeSlot,
        guaranteedPax: Number(formPax),
        expectedPax: Number(formExpectedPax),
        hallId: formHallId || null,
        comboId: formComboId || null,
        pricePerPax: Number(formPricePerPax),
        hallRent: Number(formHallRent),
        advancePaid: Number(formAdvance),
        status: formStatus,
        contactName: formContactName,
        contactPhone: formContactPhone,
        contactEmail: formContactEmail || undefined,
        notes: formNotes || undefined,
      });

      if (res.success) {
        setModalOpen(false);
        setActionNotice("Event saved successfully! KUAB automation & financials evaluated.");
        setTimeout(() => setActionNotice(null), 4000);
        window.location.reload();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving event";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (eventId: string, newStatus: string) => {
    if (!selected?.organizationId || !selected?.locationId) return;
    try {
      const res = await updateEventStatus({
        eventId,
        organizationId: selected.organizationId,
        locationId: selected.locationId,
        newStatus,
      });
      if (res.success) {
        setEventList((prev) =>
          prev.map((ev) => (ev.id === eventId ? { ...ev, status: newStatus } : ev))
        );
        if (selectedEventDetail?.id === eventId) {
          setSelectedEventDetail((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
        setActionNotice(
          `Event status changed to ${newStatus}. ${
            newStatus === "BOOKED_PAID" || newStatus === "CONFIRMED_NO_ADVANCE"
              ? "⚡ KUAB Tasks dispatched: -48h Kitchen Prep & -24h Purchasing PO!"
              : ""
          }`
        );
        setTimeout(() => setActionNotice(null), 5000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating status";
      alert(msg);
    }
  };

  const handleBillEvent = async (eventId: string) => {
    if (!selected?.organizationId || !selected?.locationId || !session?.user?.id) return;
    try {
      const res = await generateEventSalesInvoice({
        eventId,
        organizationId: selected.organizationId,
        locationId: selected.locationId,
        userId: session.user.id,
      });

      if (res.success) {
        setActionNotice(`Invoice ${res.invoiceNumber} generated! Strictly segregated to B2B Catering channel.`);
        setTimeout(() => setActionNotice(null), 6000);
        window.location.reload();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error generating invoice";
      alert(msg);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Action Notification Banner */}
      {actionNotice && (
        <div
          style={{
            padding: "0.85rem 1.25rem",
            borderRadius: "8px",
            backgroundColor: "#ecfdf5",
            border: "1px solid #6ee7b7",
            color: "#065f46",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={18} />
          {actionNotice}
        </div>
      )}

      {/* Top Controls: Calendar Header & Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#18181b", margin: 0 }}>
            {monthName} {year}
          </h1>
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button
              onClick={prevMonth}
              style={{
                padding: "0.4rem 0.6rem",
                borderRadius: "6px",
                border: "1px solid #e4e4e7",
                backgroundColor: "#ffffff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={nextMonth}
              style={{
                padding: "0.4rem 0.6rem",
                borderRadius: "6px",
                border: "1px solid #e4e4e7",
                backgroundColor: "#ffffff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* CRM Marketing Campaign trigger button */}
          <button
            onClick={() => setMarketingModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 1.1rem",
              backgroundColor: "#f4f4f5",
              color: "#18181b",
              border: "1px solid #e4e4e7",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.85rem",
            }}
          >
            <Megaphone size={16} color="#d97706" />
            Market to Event Clients ({selectedCustomerIds.size})
          </button>

          <button
            onClick={() => openNewEventModal()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 1.25rem",
              backgroundColor: "#18181b",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.85rem",
            }}
          >
            <Plus size={16} />
            Book Event / Catering
          </button>
        </div>
      </div>

      {/* 7 Color Status Legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.6rem",
          padding: "0.75rem 1rem",
          backgroundColor: "#fafafa",
          border: "1px solid #f4f4f5",
          borderRadius: "8px",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#71717a", textTransform: "uppercase" }}>
          Legend:
        </span>
        {Object.entries(STATUS_COLORS).map(([key, item]) => (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.78rem",
              color: item.text,
              backgroundColor: item.bg,
              border: `1px solid ${item.border}`,
              padding: "0.15rem 0.55rem",
              borderRadius: "4px",
              fontWeight: 500,
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: item.text,
              }}
            />
            {item.label}
          </div>
        ))}
      </div>

      {/* Monthly Interactive Calendar Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "1px",
          backgroundColor: "#e4e4e7",
          border: "1px solid #e4e4e7",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
          <div
            key={dayName}
            style={{
              padding: "0.6rem",
              textAlign: "center",
              backgroundColor: "#f4f4f5",
              fontWeight: 600,
              fontSize: "0.82rem",
              color: "#52525b",
            }}
          >
            {dayName}
          </div>
        ))}

        {/* Empty cells before start of month */}
        {Array.from({ length: startingDayOfWeek }).map((_, idx) => (
          <div
            key={`empty-${idx}`}
            style={{
              minHeight: "110px",
              backgroundColor: "#fafafa",
              opacity: 0.5,
            }}
          />
        ))}

        {/* Calendar days */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const dayDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const dayEvents = eventsByDay.get(dayNum) || [];
          const isToday =
            new Date().getDate() === dayNum &&
            new Date().getMonth() === month &&
            new Date().getFullYear() === year;

          return (
            <div
              key={`day-${dayNum}`}
              onClick={() => {
                if (dayEvents.length > 0) setSelectedEventDetail(dayEvents[0]);
                else openNewEventModal(dayDateStr);
              }}
              style={{
                minHeight: "110px",
                backgroundColor: isToday ? "#fffbeb" : "#ffffff",
                padding: "0.5rem",
                display: "flex",
                flexDirection: "column",
                cursor: "pointer",
                transition: "background-color 0.15s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.35rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? "#b45309" : "#3f3f46",
                  }}
                >
                  {dayNum}
                </span>
                {dayEvents.length > 0 && (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      backgroundColor: "#f4f4f5",
                      color: "#71717a",
                      padding: "0.05rem 0.35rem",
                      borderRadius: "10px",
                    }}
                  >
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Day Event Badges */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", overflow: "hidden" }}>
                {dayEvents.slice(0, 3).map((ev) => {
                  const colorConfig = STATUS_COLORS[ev.status] || STATUS_COLORS.ENQUIRY;
                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEventDetail(ev);
                      }}
                      style={{
                        padding: "0.2rem 0.4rem",
                        borderRadius: "4px",
                        backgroundColor: colorConfig.bg,
                        border: `1px solid ${colorConfig.border}`,
                        color: colorConfig.text,
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      <span>{ev.title}</span>
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <span style={{ fontSize: "0.7rem", color: "#a1a1aa", fontStyle: "italic" }}>
                    +{dayEvents.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CRM Client Selection Table for Targeted Marketing */}
      <div
        className="card"
        style={{
          border: "1px solid #e4e4e7",
          borderRadius: "10px",
          padding: "1.25rem",
          backgroundColor: "#ffffff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#18181b", margin: 0 }}>
              Event Customer Marketing Hub
            </h3>
            <p style={{ fontSize: "0.82rem", color: "#71717a", margin: "0.2rem 0 0" }}>
              High-Value Event Clients tagged with <code>[&quot;HIGH_VALUE_CATERING&quot;]</code> for drip campaigns.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={selectAllCustomers}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 0.85rem",
                backgroundColor: "#f4f4f5",
                border: "1px solid #d4d4d8",
                borderRadius: "6px",
                fontSize: "0.8rem",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              {selectedCustomerIds.size === uniqueEventCustomers.length ? (
                <CheckSquare size={16} color="#059669" />
              ) : (
                <Square size={16} />
              )}
              Select All ({uniqueEventCustomers.length})
            </button>
            <button
              disabled={selectedCustomerIds.size === 0}
              onClick={() => setMarketingModalOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 1rem",
                backgroundColor: selectedCustomerIds.size === 0 ? "#e4e4e7" : "#d97706",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: selectedCustomerIds.size === 0 ? "not-allowed" : "pointer",
              }}
            >
              <Send size={15} />
              Launch Marketing Template ({selectedCustomerIds.size})
            </button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e4e4e7", textAlign: "left", color: "#71717a" }}>
                <th style={{ padding: "0.6rem 0.5rem", width: "40px" }}></th>
                <th style={{ padding: "0.6rem 0.75rem" }}>Customer Name</th>
                <th style={{ padding: "0.6rem 0.75rem" }}>Phone Number</th>
                <th style={{ padding: "0.6rem 0.75rem" }}>Booked Events</th>
                <th style={{ padding: "0.6rem 0.75rem" }}>CRM Segment</th>
              </tr>
            </thead>
            <tbody>
              {uniqueEventCustomers.map((cust) => {
                const isSelected = selectedCustomerIds.has(cust.id);
                return (
                  <tr
                    key={cust.id}
                    onClick={() => toggleCustomerSelection(cust.id)}
                    style={{
                      borderBottom: "1px solid #f4f4f5",
                      backgroundColor: isSelected ? "#fefce8" : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <td style={{ padding: "0.6rem 0.5rem", textAlign: "center" }}>
                      {isSelected ? (
                        <CheckSquare size={16} color="#d97706" />
                      ) : (
                        <Square size={16} color="#a1a1aa" />
                      )}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", fontWeight: 600, color: "#18181b" }}>
                      {cust.name}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#52525b" }}>{cust.phone}</td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#52525b" }}>{cust.eventsCount} Events</td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>
                      <span
                        style={{
                          backgroundColor: "#fef3c7",
                          color: "#92400e",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          padding: "0.15rem 0.5rem",
                          borderRadius: "4px",
                        }}
                      >
                        HIGH_VALUE_CATERING
                      </span>
                    </td>
                  </tr>
                );
              })}
              {uniqueEventCustomers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "#a1a1aa" }}>
                    No event customers registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: EVENT DETAILS & KUAB / INVOICE CONTROLS */}
      {selectedEventDetail && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "560px",
              padding: "1.75rem",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.6rem",
                    borderRadius: "4px",
                    backgroundColor: STATUS_COLORS[selectedEventDetail.status]?.bg || "#f4f4f5",
                    color: STATUS_COLORS[selectedEventDetail.status]?.text || "#18181b",
                    border: `1px solid ${STATUS_COLORS[selectedEventDetail.status]?.border || "#e4e4e7"}`,
                  }}
                >
                  {STATUS_COLORS[selectedEventDetail.status]?.label}
                </span>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#18181b", marginTop: "0.5rem" }}>
                  {selectedEventDetail.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedEventDetail(null)}
                style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem", fontSize: "0.85rem" }}>
              <div>
                <span style={{ color: "#71717a" }}>Date & Time:</span>
                <div style={{ fontWeight: 600, color: "#18181b" }}>
                  {new Date(selectedEventDetail.eventDate).toLocaleDateString()} ({selectedEventDetail.timeSlot})
                </div>
              </div>
              <div>
                <span style={{ color: "#71717a" }}>Guaranteed Pax:</span>
                <div style={{ fontWeight: 600, color: "#18181b" }}>
                  {selectedEventDetail.guaranteedPax} Pax (Expected: {selectedEventDetail.expectedPax})
                </div>
              </div>
              <div>
                <span style={{ color: "#71717a" }}>Venue / Hall:</span>
                <div style={{ fontWeight: 600, color: "#18181b" }}>
                  {selectedEventDetail.hallName || "External / No Hall"}
                </div>
              </div>
              <div>
                <span style={{ color: "#71717a" }}>Catering Package:</span>
                <div style={{ fontWeight: 600, color: "#18181b" }}>
                  {selectedEventDetail.comboName || "Custom Menu"}
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div style={{ marginTop: "1.25rem", padding: "1rem", backgroundColor: "#fafafa", borderRadius: "8px", border: "1px solid #e4e4e7" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", marginBottom: "0.35rem" }}>
                <span style={{ color: "#52525b" }}>Food Cost ({selectedEventDetail.guaranteedPax} Pax @ ₹{Number(selectedEventDetail.pricePerPax)}):</span>
                <strong>₹{Number(selectedEventDetail.financials?.totalFoodCost || 0).toLocaleString()}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", marginBottom: "0.35rem" }}>
                <span style={{ color: "#52525b" }}>Hall Rent:</span>
                <strong>₹{Number(selectedEventDetail.financials?.hallRentAmount || 0).toLocaleString()}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1rem", fontWeight: 700, color: "#18181b", borderTop: "1px solid #e4e4e7", paddingTop: "0.5rem" }}>
                <span>Total Amount:</span>
                <span>₹{Number(selectedEventDetail.financials?.grandTotal || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#047857", marginTop: "0.25rem" }}>
                <span>Advance Paid:</span>
                <span>₹{Number(selectedEventDetail.financials?.advancePaid || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#dc2626", marginTop: "0.25rem" }}>
                <span>Balance Due:</span>
                <span>₹{Number(selectedEventDetail.financials?.balanceDue || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Status Change Progression Buttons */}
            <div style={{ marginTop: "1.25rem" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#71717a", textTransform: "uppercase" }}>
                Shift Status:
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.4rem" }}>
                {Object.keys(STATUS_COLORS).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(selectedEventDetail.id, st)}
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.3rem 0.6rem",
                      borderRadius: "4px",
                      border: selectedEventDetail.status === st ? "2px solid #18181b" : "1px solid #d4d4d8",
                      backgroundColor: STATUS_COLORS[st].bg,
                      color: STATUS_COLORS[st].text,
                      cursor: "pointer",
                      fontWeight: selectedEventDetail.status === st ? 700 : 500,
                    }}
                  >
                    {STATUS_COLORS[st].label}
                  </button>
                ))}
              </div>
            </div>

            {/* B2B Sales Invoice Generation */}
            <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                onClick={() => {
                  setSelectedEventDetail(null);
                  openEditEventModal(selectedEventDetail);
                }}
                style={{
                  padding: "0.55rem 1rem",
                  backgroundColor: "#f4f4f5",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Edit Details
              </button>

              {selectedEventDetail.financials?.invoiceId ? (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <a
                    href={`/sales/invoices?q=${encodeURIComponent(selectedEventDetail.title)}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      padding: "0.55rem 1rem",
                      backgroundColor: "#10b981",
                      color: "#ffffff",
                      textDecoration: "none",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    <FileText size={15} />
                    View B2B Invoice
                  </a>
                  <a
                    href={`/finance/sales-receivables/receipts?q=${encodeURIComponent(selectedEventDetail.contactName)}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      padding: "0.55rem 1rem",
                      backgroundColor: "#3b82f6",
                      color: "#ffffff",
                      textDecoration: "none",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    <Receipt size={15} />
                    Finance Receipt
                  </a>
                </div>
              ) : (
                <button
                  onClick={() => handleBillEvent(selectedEventDetail.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.55rem 1.25rem",
                    backgroundColor: "#18181b",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <FileText size={15} />
                  Generate B2B Catering Invoice
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT EVENT FORM */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "580px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "1.75rem",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem", color: "#18181b" }}>
              {editingEvent ? "Edit Event / Catering Booking" : "New Event / Catering Reservation"}
            </h3>

            <form onSubmit={handleSaveEvent} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh & Priya Wedding Reception"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: "6px",
                    border: "1px solid #d4d4d8",
                    marginTop: "0.25rem",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>Function Type *</label>
                  <select
                    value={formFunctionType}
                    onChange={(e) => setFormFunctionType(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      borderRadius: "6px",
                      border: "1px solid #d4d4d8",
                      marginTop: "0.25rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    {availableFunctionTypes.map((fn) => (
                      <option key={fn} value={fn}>
                        {fn}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>Time Slot *</label>
                  <select
                    value={formTimeSlot}
                    onChange={(e) => setFormTimeSlot(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      borderRadius: "6px",
                      border: "1px solid #d4d4d8",
                      marginTop: "0.25rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    {availableTimeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>Event Date *</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: "6px",
                    border: "1px solid #d4d4d8",
                    marginTop: "0.25rem",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>Guaranteed Pax *</label>
                  <input
                    type="number"
                    required
                    value={formPax}
                    onChange={(e) => setFormPax(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      borderRadius: "6px",
                      border: "1px solid #d4d4d8",
                      marginTop: "0.25rem",
                      fontSize: "0.9rem",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>Expected Pax</label>
                  <input
                    type="number"
                    value={formExpectedPax}
                    onChange={(e) => setFormExpectedPax(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      borderRadius: "6px",
                      border: "1px solid #d4d4d8",
                      marginTop: "0.25rem",
                      fontSize: "0.9rem",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>Venue / Hall</label>
                  <select
                    value={formHallId}
                    onChange={(e) => {
                      setFormHallId(e.target.value);
                      const hall = halls.find((h) => h.id === e.target.value);
                      if (hall) setFormHallRent(Number(hall.baseRent));
                    }}
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      borderRadius: "6px",
                      border: "1px solid #d4d4d8",
                      marginTop: "0.25rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    <option value="">No Hall (Outdoor / Catering Only)</option>
                    {halls.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.hallName} ({h.capacity} Pax - ₹{Number(h.baseRent)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>Catering Package</label>
                  <select
                    value={formComboId}
                    onChange={(e) => {
                      setFormComboId(e.target.value);
                      const combo = combos.find((c) => c.id === e.target.value);
                      if (combo) setFormPricePerPax(Number(combo.basePricePerPax));
                    }}
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      borderRadius: "6px",
                      border: "1px solid #d4d4d8",
                      marginTop: "0.25rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    <option value="">Custom Menu</option>
                    {combos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.mealType} - ₹{Number(c.basePricePerPax)}/pax)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>Price / Pax (₹)</label>
                  <input
                    type="number"
                    value={formPricePerPax}
                    onChange={(e) => setFormPricePerPax(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      borderRadius: "6px",
                      border: "1px solid #d4d4d8",
                      marginTop: "0.25rem",
                      fontSize: "0.9rem",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>Advance Paid (₹)</label>
                  <input
                    type="number"
                    value={formAdvance}
                    onChange={(e) => setFormAdvance(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      borderRadius: "6px",
                      border: "1px solid #d4d4d8",
                      marginTop: "0.25rem",
                      fontSize: "0.9rem",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>Contact Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Customer Name"
                    value={formContactName}
                    onChange={(e) => setFormContactName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      borderRadius: "6px",
                      border: "1px solid #d4d4d8",
                      marginTop: "0.25rem",
                      fontSize: "0.9rem",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>Contact Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="9876543210"
                    value={formContactPhone}
                    onChange={(e) => setFormContactPhone(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      borderRadius: "6px",
                      border: "1px solid #d4d4d8",
                      marginTop: "0.25rem",
                      fontSize: "0.9rem",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>Initial Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: "6px",
                    border: "1px solid #d4d4d8",
                    marginTop: "0.25rem",
                    fontSize: "0.9rem",
                  }}
                >
                  {Object.entries(STATUS_COLORS).map(([stKey, stObj]) => (
                    <option key={stKey} value={stKey}>
                      {stObj.label} ({stObj.badge})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: "0.6rem 1.1rem",
                    backgroundColor: "#f4f4f5",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: "0.6rem 1.25rem",
                    backgroundColor: "#18181b",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  {isSubmitting ? "Saving..." : "Save Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MARKETING HANDOFF AUDIENCE SELECTOR MODAL */}
      {marketingModalOpen && selected?.organizationId && (
        <AudienceSelectorModal
          organizationId={selected.organizationId}
          locationId={selected.locationId}
          targetEntityType="CUSTOMER"
          entityIds={Array.from(selectedCustomerIds)}
          displayData={displayAudienceItems}
          defaultTemplateName="Catering & Event Special Offer"
          onClose={() => setMarketingModalOpen(false)}
        />
      )}
    </div>
  );
}
