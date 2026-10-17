"use client";

import React, { useState } from "react";
import { useSessionView } from "@/components/AppShell";
import {
  upsertHallConfiguration,
  upsertCateringCombo,
  deleteHallConfiguration,
  deleteCateringCombo,
} from "@/app/events/actions";
import { Building, Utensils, Plus, Trash2, CheckCircle2, AlertCircle, X, Edit3 } from "lucide-react";
import { useEscapeKey } from "@/hooks/useEscapeKey";

export interface HallConfig {
  id: string;
  hallName: string;
  capacity: number;
  baseRent: string | number;
  cleaningFee: string | number;
  cautionDeposit: string | number;
  timeSlots: string[];
  functionTypes: string[];
}

export interface CateringComboConfig {
  id: string;
  name: string;
  mealType: string;
  description?: string | null;
  menuItems: string[];
  basePricePerPax: string | number;
}

export interface PricingTierConfig {
  id?: string;
  comboId?: string;
  minPax: number;
  maxPax?: number | null;
  pricePerPax: string | number;
}

interface Props {
  initialHalls: HallConfig[];
  initialCombos: CateringComboConfig[];
  initialTiers: PricingTierConfig[];
}

export default function EventsSettingsClient({ initialHalls, initialCombos, initialTiers }: Props) {
  const { selected } = useSessionView();
  const [activeTab, setActiveTab] = useState<"HALLS" | "COMBOS">("HALLS");

  // Halls State
  const [halls, setHalls] = useState<HallConfig[]>(initialHalls);
  const [hallModalOpen, setHallModalOpen] = useState(false);
  const [editingHall, setEditingHall] = useState<HallConfig | null>(null);

  // Combos State
  const [combos, setCombos] = useState<CateringComboConfig[]>(initialCombos);
  const [comboModalOpen, setComboModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<CateringComboConfig | null>(null);

  // Status message
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manageable Global Catalog of Time Slots and Function Types
  const initialAvailableSlots = Array.from(
    new Set([
      "MORNING",
      "EVENING",
      "FULL_DAY",
      ...initialHalls.flatMap((h) => (Array.isArray(h.timeSlots) ? h.timeSlots : [])),
    ])
  );
  const initialAvailableFunctions = Array.from(
    new Set([
      "WEDDING",
      "RECEPTION",
      "BIRTHDAY",
      "CORPORATE",
      "ANNIVERSARY",
      "GET_TOGETHER",
      ...initialHalls.flatMap((h) => (Array.isArray(h.functionTypes) ? h.functionTypes : [])),
    ])
  );

  const [availableSlots, setAvailableSlots] = useState<string[]>(initialAvailableSlots);
  const [availableFunctions, setAvailableFunctions] = useState<string[]>(initialAvailableFunctions);

  // Quick inputs to add custom time slot or function type
  const [newSlotInput, setNewSlotInput] = useState("");
  const [newFunctionInput, setNewFunctionInput] = useState("");
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [isAddingFunction, setIsAddingFunction] = useState(false);

  // Hall Form fields
  const [hallName, setHallName] = useState("");
  const [hallCapacity, setHallCapacity] = useState(150);
  const [hallBaseRent, setHallBaseRent] = useState(15000);
  const [hallCleaningFee, setHallCleaningFee] = useState(1500);
  const [hallDeposit, setHallDeposit] = useState(5000);
  const [selectedSlots, setSelectedSlots] = useState<string[]>(["MORNING", "EVENING", "FULL_DAY"]);
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([
    "WEDDING",
    "RECEPTION",
    "BIRTHDAY",
    "CORPORATE",
    "ANNIVERSARY",
    "GET_TOGETHER",
  ]);

  // Combo Form fields
  const [comboName, setComboName] = useState("");
  const [comboMealType, setComboMealType] = useState("LUNCH");
  const [comboDesc, setComboDesc] = useState("");
  const [comboItemsInput, setComboItemsInput] = useState("");
  const [comboBasePrice, setComboBasePrice] = useState(350);
  const [pricingTiers, setPricingTiers] = useState<
    { minPax: number; maxPax?: number | null; pricePerPax: number }[]
  >([
    { minPax: 50, maxPax: 99, pricePerPax: 400 },
    { minPax: 100, maxPax: 299, pricePerPax: 350 },
    { minPax: 300, maxPax: null, pricePerPax: 300 },
  ]);

  // ESCAPE KEY SHORTCUT (Requirement 2): Close all modals on ESC press
  useEscapeKey(() => setHallModalOpen(false), hallModalOpen);
  useEscapeKey(() => setComboModalOpen(false), comboModalOpen);

  const handleAddSlot = () => {
    const val = newSlotInput.trim().toUpperCase().replace(/\s+/g, "_");
    if (!val) return;
    if (!availableSlots.includes(val)) {
      setAvailableSlots((prev) => [...prev, val]);
    }
    if (!selectedSlots.includes(val)) {
      setSelectedSlots((prev) => [...prev, val]);
    }
    setNewSlotInput("");
    setIsAddingSlot(false);
  };

  const handleDeleteSlot = (slotToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAvailableSlots((prev) => prev.filter((s) => s !== slotToDelete));
    setSelectedSlots((prev) => prev.filter((s) => s !== slotToDelete));
  };

  const handleAddFunction = () => {
    const val = newFunctionInput.trim().toUpperCase().replace(/\s+/g, "_");
    if (!val) return;
    if (!availableFunctions.includes(val)) {
      setAvailableFunctions((prev) => [...prev, val]);
    }
    if (!selectedFunctions.includes(val)) {
      setSelectedFunctions((prev) => [...prev, val]);
    }
    setNewFunctionInput("");
    setIsAddingFunction(false);
  };

  const handleDeleteFunction = (fnToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAvailableFunctions((prev) => prev.filter((f) => f !== fnToDelete));
    setSelectedFunctions((prev) => prev.filter((f) => f !== fnToDelete));
  };

  const openHallModal = (hall?: HallConfig) => {
    if (hall) {
      setEditingHall(hall);
      setHallName(hall.hallName);
      setHallCapacity(hall.capacity);
      setHallBaseRent(Number(hall.baseRent));
      setHallCleaningFee(Number(hall.cleaningFee));
      setHallDeposit(Number(hall.cautionDeposit));
      const hallSlots = Array.isArray(hall.timeSlots) ? hall.timeSlots : ["MORNING", "EVENING", "FULL_DAY"];
      const hallFns = Array.isArray(hall.functionTypes)
        ? hall.functionTypes
        : ["WEDDING", "RECEPTION", "BIRTHDAY", "CORPORATE"];
      setSelectedSlots(hallSlots);
      setSelectedFunctions(hallFns);
      // Ensure all hall items exist in available options
      setAvailableSlots((prev) => Array.from(new Set([...prev, ...hallSlots])));
      setAvailableFunctions((prev) => Array.from(new Set([...prev, ...hallFns])));
    } else {
      setEditingHall(null);
      setHallName("");
      setHallCapacity(150);
      setHallBaseRent(15000);
      setHallCleaningFee(1500);
      setHallDeposit(5000);
      setSelectedSlots(["MORNING", "EVENING", "FULL_DAY"]);
      setSelectedFunctions(["WEDDING", "RECEPTION", "BIRTHDAY", "CORPORATE", "ANNIVERSARY", "GET_TOGETHER"]);
    }
    setIsAddingSlot(false);
    setIsAddingFunction(false);
    setNewSlotInput("");
    setNewFunctionInput("");
    setHallModalOpen(true);
  };

  const handleDeleteHall = async (hallId: string, hallName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selected?.organizationId || !selected?.locationId) return;
    if (!confirm(`Are you sure you want to delete "${hallName}"? This cannot be undone.`)) return;

    try {
      const res = await deleteHallConfiguration({
        id: hallId,
        organizationId: selected.organizationId,
        locationId: selected.locationId,
      });
      if (res.success) {
        setHalls((prev) => prev.filter((h) => h.id !== hallId));
        setStatusMsg({ text: `Banquet hall "${hallName}" deleted successfully.`, type: "success" });
      }
    } catch (err: any) {
      setStatusMsg({ text: err?.message || "Failed to delete hall", type: "error" });
    }
  };

  const handleDeleteComboItem = async (comboId: string, comboName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selected?.organizationId || !selected?.locationId) return;
    if (!confirm(`Are you sure you want to delete catering package "${comboName}"?`)) return;

    try {
      const res = await deleteCateringCombo({
        id: comboId,
        organizationId: selected.organizationId,
        locationId: selected.locationId,
      });
      if (res.success) {
        setCombos((prev) => prev.filter((c) => c.id !== comboId));
        setStatusMsg({ text: `Catering combo "${comboName}" deleted successfully.`, type: "success" });
      }
    } catch (err: any) {
      setStatusMsg({ text: err?.message || "Failed to delete combo", type: "error" });
    }
  };

  const openComboModal = (combo?: CateringComboConfig) => {
    if (combo) {
      setEditingCombo(combo);
      setComboName(combo.name);
      setComboMealType(combo.mealType);
      setComboDesc(combo.description || "");
      setComboItemsInput(Array.isArray(combo.menuItems) ? combo.menuItems.join(", ") : "");
      setComboBasePrice(Number(combo.basePricePerPax));
      const comboTiers = initialTiers
        .filter((t) => t.comboId === combo.id)
        .map((t) => ({
          minPax: t.minPax,
          maxPax: t.maxPax,
          pricePerPax: Number(t.pricePerPax),
        }));
      setPricingTiers(
        comboTiers.length > 0
          ? comboTiers
          : [
              { minPax: 50, maxPax: 99, pricePerPax: Number(combo.basePricePerPax) + 50 },
              { minPax: 100, maxPax: 299, pricePerPax: Number(combo.basePricePerPax) },
              { minPax: 300, maxPax: null, pricePerPax: Math.max(1, Number(combo.basePricePerPax) - 50) },
            ]
      );
    } else {
      setEditingCombo(null);
      setComboName("");
      setComboMealType("LUNCH");
      setComboDesc("");
      setComboItemsInput("Welcome Drink, Veg Briyani, Paneer Butter Masala, Parotta, Curd Rice, Gulab Jamun, Ice Cream");
      setComboBasePrice(350);
      setPricingTiers([
        { minPax: 50, maxPax: 99, pricePerPax: 400 },
        { minPax: 100, maxPax: 299, pricePerPax: 350 },
        { minPax: 300, maxPax: null, pricePerPax: 300 },
      ]);
    }
    setComboModalOpen(true);
  };

  const saveHall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected?.organizationId || !selected?.locationId) {
      setStatusMsg({ text: "Please select an active Organization and Location first.", type: "error" });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const res = await upsertHallConfiguration({
        id: editingHall?.id,
        organizationId: selected.organizationId,
        locationId: selected.locationId,
        hallName,
        capacity: Number(hallCapacity),
        timeSlots: selectedSlots,
        functionTypes: selectedFunctions,
        baseRent: Number(hallBaseRent),
        cleaningFee: Number(hallCleaningFee),
        cautionDeposit: Number(hallDeposit),
      });

      if (res.success) {
        setStatusMsg({ text: "Hall configuration saved successfully!", type: "success" });
        setHallModalOpen(false);
        // Refresh local view
        setHalls((prev) => {
          if (editingHall) {
            return prev.map((h) =>
              h.id === editingHall.id
                ? {
                    ...h,
                    hallName,
                    capacity: hallCapacity,
                    baseRent: hallBaseRent,
                    cleaningFee: hallCleaningFee,
                    cautionDeposit: hallDeposit,
                    timeSlots: selectedSlots,
                    functionTypes: selectedFunctions,
                  }
                : h
            );
          }
          return [
            {
              id: "temp-" + Date.now(),
              hallName,
              capacity: hallCapacity,
              baseRent: hallBaseRent,
              cleaningFee: hallCleaningFee,
              cautionDeposit: hallDeposit,
              timeSlots: selectedSlots,
              functionTypes: selectedFunctions,
            },
            ...prev,
          ];
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save hall configuration";
      setStatusMsg({ text: message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected?.organizationId || !selected?.locationId) {
      setStatusMsg({ text: "Please select an active Organization and Location first.", type: "error" });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    const items = comboItemsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await upsertCateringCombo({
        id: editingCombo?.id,
        organizationId: selected.organizationId,
        locationId: selected.locationId,
        name: comboName,
        mealType: comboMealType,
        description: comboDesc,
        menuItems: items,
        basePricePerPax: Number(comboBasePrice),
        tiers: pricingTiers,
      });

      if (res.success) {
        setStatusMsg({ text: "Catering combo and pricing tiers saved successfully!", type: "success" });
        setComboModalOpen(false);
        setCombos((prev) => {
          if (editingCombo) {
            return prev.map((c) =>
              c.id === editingCombo.id
                ? {
                    ...c,
                    name: comboName,
                    mealType: comboMealType,
                    description: comboDesc,
                    menuItems: items,
                    basePricePerPax: comboBasePrice,
                  }
                : c
            );
          }
          return [
            {
              id: res.comboId || "temp-" + Date.now(),
              name: comboName,
              mealType: comboMealType,
              description: comboDesc,
              menuItems: items,
              basePricePerPax: comboBasePrice,
            },
            ...prev,
          ];
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save combo";
      setStatusMsg({ text: message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Notifications */}
      {statusMsg && (
        <div
          style={{
            padding: "0.85rem 1.25rem",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            background: statusMsg.type === "success" ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${statusMsg.type === "success" ? "#a7f3d0" : "#fecaca"}`,
            color: statusMsg.type === "success" ? "#065f46" : "#991b1b",
            fontSize: "0.9rem",
          }}
        >
          {statusMsg.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #e4e4e7",
          gap: "1.5rem",
        }}
      >
        <button
          onClick={() => setActiveTab("HALLS")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "HALLS" ? "2px solid #d4af37" : "2px solid transparent",
            color: activeTab === "HALLS" ? "#18181b" : "#71717a",
            fontWeight: activeTab === "HALLS" ? 600 : 500,
            padding: "0.75rem 0.5rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.95rem",
          }}
        >
          <Building size={18} />
          Hall Definitions ({halls.length})
        </button>
        <button
          onClick={() => setActiveTab("COMBOS")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "COMBOS" ? "2px solid #d4af37" : "2px solid transparent",
            color: activeTab === "COMBOS" ? "#18181b" : "#71717a",
            fontWeight: activeTab === "COMBOS" ? 600 : 500,
            padding: "0.75rem 0.5rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.95rem",
          }}
        >
          <Utensils size={18} />
          Catering Combos & Tiered Pricing ({combos.length})
        </button>
      </div>

      {/* TAB 1: HALL DEFINITIONS */}
      {activeTab === "HALLS" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 600, color: "#18181b" }}>Function & Banquet Halls</h2>
              <p style={{ fontSize: "0.85rem", color: "#71717a" }}>
                Configure hall capacities, rent, caution deposit, and available time slots.
              </p>
            </div>
            <button
              onClick={() => openHallModal()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.6rem 1.1rem",
                backgroundColor: "#18181b",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: "0.85rem",
              }}
            >
              <Plus size={16} /> Add New Hall
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {halls.map((hall) => (
              <div
                key={hall.id}
                className="card"
                style={{
                  border: "1px solid #e4e4e7",
                  borderRadius: "10px",
                  padding: "1.25rem",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#18181b" }}>{hall.hallName}</h3>
                    <span
                      style={{
                        padding: "0.2rem 0.6rem",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        backgroundColor: "#f4f4f5",
                        color: "#52525b",
                      }}
                    >
                      {hall.capacity} Pax
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem", color: "#52525b" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Base Rent:</span>
                      <strong style={{ color: "#18181b" }}>₹{Number(hall.baseRent).toLocaleString()}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Cleaning Fee:</span>
                      <span>₹{Number(hall.cleaningFee).toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Caution Deposit:</span>
                      <span>₹{Number(hall.cautionDeposit).toLocaleString()}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: "1rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#71717a", textTransform: "uppercase", fontWeight: 600 }}>
                      Time Slots
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.3rem" }}>
                      {(Array.isArray(hall.timeSlots) ? hall.timeSlots : []).map((slot: string) => (
                        <span
                          key={slot}
                          style={{
                            padding: "0.15rem 0.5rem",
                            fontSize: "0.72rem",
                            borderRadius: "4px",
                            backgroundColor: "#eff6ff",
                            color: "#1d4ed8",
                            border: "1px solid #dbeafe",
                          }}
                        >
                          {slot}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "1.25rem", paddingTop: "0.75rem", borderTop: "1px solid #f4f4f5", display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => openHallModal(hall)}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      background: "#f4f4f5",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      color: "#18181b",
                    }}
                  >
                    Edit Configuration
                  </button>
                  <button
                    onClick={(e) => handleDeleteHall(hall.id, hall.hallName, e)}
                    title="Delete banquet hall"
                    style={{
                      padding: "0.5rem 0.75rem",
                      background: "#fef2f2",
                      border: "1px solid #fee2e2",
                      borderRadius: "6px",
                      cursor: "pointer",
                      color: "#dc2626",
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {halls.length === 0 && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  padding: "3rem",
                  textAlign: "center",
                  backgroundColor: "#fafafa",
                  borderRadius: "8px",
                  border: "1px dashed #d4d4d8",
                  color: "#71717a",
                }}
              >
                <Building size={36} style={{ margin: "0 auto 0.75rem", opacity: 0.4 }} />
                <p>No banquet halls configured for this location yet.</p>
                <button
                  onClick={() => openHallModal()}
                  style={{
                    marginTop: "0.75rem",
                    padding: "0.5rem 1rem",
                    backgroundColor: "#18181b",
                    color: "#fff",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Create First Hall
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CATERING COMBOS & TIERED PRICING */}
      {activeTab === "COMBOS" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 600, color: "#18181b" }}>
                Catering Combos & Volume Tier Matrix
              </h2>
              <p style={{ fontSize: "0.85rem", color: "#71717a" }}>
                Set up per-pax pricing curves based on volume (e.g. 50-99 pax @ ₹400 vs 300+ pax @ ₹300).
              </p>
            </div>
            <button
              onClick={() => openComboModal()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.6rem 1.1rem",
                backgroundColor: "#18181b",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: "0.85rem",
              }}
            >
              <Plus size={16} /> Add Catering Combo
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {combos.map((combo) => {
              const comboTiers = initialTiers.filter((t) => t.comboId === combo.id);
              return (
                <div
                  key={combo.id}
                  className="card"
                  style={{
                    border: "1px solid #e4e4e7",
                    borderRadius: "10px",
                    padding: "1.25rem",
                    backgroundColor: "#ffffff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <div>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#18181b" }}>{combo.name}</h3>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "#854d0e",
                            backgroundColor: "#fef9c3",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "4px",
                          }}
                        >
                          {combo.mealType}
                        </span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "0.75rem", color: "#71717a" }}>Base / Pax</span>
                        <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#18181b" }}>
                          ₹{Number(combo.basePricePerPax).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {combo.description && (
                      <p style={{ fontSize: "0.85rem", color: "#71717a", marginBottom: "0.75rem" }}>
                        {combo.description}
                      </p>
                    )}

                    {/* Menu items */}
                    <div style={{ marginBottom: "1rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "#71717a", textTransform: "uppercase", fontWeight: 600 }}>
                        Menu Items ({(Array.isArray(combo.menuItems) ? combo.menuItems : []).length})
                      </span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.3rem" }}>
                        {(Array.isArray(combo.menuItems) ? combo.menuItems : []).map((item: string, idx: number) => (
                          <span
                            key={idx}
                            style={{
                              padding: "0.15rem 0.45rem",
                              fontSize: "0.72rem",
                              borderRadius: "4px",
                              backgroundColor: "#f4f4f5",
                              color: "#3f3f46",
                            }}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Volume Tier Matrix */}
                    <div style={{ backgroundColor: "#fafafa", borderRadius: "8px", padding: "0.75rem", border: "1px solid #f4f4f5" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#52525b" }}>
                        Volume Tier Matrix:
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginTop: "0.4rem" }}>
                        {comboTiers.map((t) => (
                          <div
                            key={t.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "0.82rem",
                              color: "#52525b",
                            }}
                          >
                            <span>
                              {t.minPax} - {t.maxPax ? `${t.maxPax} Pax` : "+ Pax"}
                            </span>
                            <strong style={{ color: "#047857" }}>₹{Number(t.pricePerPax)} / pax</strong>
                          </div>
                        ))}
                        {comboTiers.length === 0 && (
                          <span style={{ fontSize: "0.78rem", color: "#a1a1aa" }}>Standard Flat Rate</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: "1.25rem", paddingTop: "0.75rem", borderTop: "1px solid #f4f4f5", display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => openComboModal(combo)}
                      style={{
                        flex: 1,
                        padding: "0.5rem",
                        background: "#f4f4f5",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        fontWeight: 500,
                        color: "#18181b",
                      }}
                    >
                      Edit Menu & Pricing Matrix
                    </button>
                    <button
                      onClick={(e) => handleDeleteComboItem(combo.id, combo.name, e)}
                      title="Delete catering combo"
                      style={{
                        padding: "0.5rem 0.75rem",
                        background: "#fef2f2",
                        border: "1px solid #fee2e2",
                        borderRadius: "6px",
                        cursor: "pointer",
                        color: "#dc2626",
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}

            {combos.length === 0 && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  padding: "3rem",
                  textAlign: "center",
                  backgroundColor: "#fafafa",
                  borderRadius: "8px",
                  border: "1px dashed #d4d4d8",
                  color: "#71717a",
                }}
              >
                <Utensils size={36} style={{ margin: "0 auto 0.75rem", opacity: 0.4 }} />
                <p>No catering combos or pricing tiers set up yet.</p>
                <button
                  onClick={() => openComboModal()}
                  style={{
                    marginTop: "0.75rem",
                    padding: "0.5rem 1rem",
                    backgroundColor: "#18181b",
                    color: "#fff",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Create Catering Combo
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: HALL CONFIGURATION */}
      {hallModalOpen && (
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
              maxWidth: "540px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "1.75rem",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem", color: "#18181b" }}>
              {editingHall ? "Edit Banquet Hall" : "Add Banquet Hall"}
            </h3>

            <form onSubmit={saveHall} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>Hall Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Grand Ballroom"
                  value={hallName}
                  onChange={(e) => setHallName(e.target.value)}
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
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>Capacity (Pax) *</label>
                  <input
                    type="number"
                    required
                    value={hallCapacity}
                    onChange={(e) => setHallCapacity(Number(e.target.value))}
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
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>Base Rent (₹) *</label>
                  <input
                    type="number"
                    required
                    value={hallBaseRent}
                    onChange={(e) => setHallBaseRent(Number(e.target.value))}
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
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>Cleaning Fee (₹)</label>
                  <input
                    type="number"
                    value={hallCleaningFee}
                    onChange={(e) => setHallCleaningFee(Number(e.target.value))}
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
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>Caution Deposit (₹)</label>
                  <input
                    type="number"
                    value={hallDeposit}
                    onChange={(e) => setHallDeposit(Number(e.target.value))}
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

              {/* SUPPORTED TIME SLOTS (Dynamic Add, Select, Delete) */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>
                    Supported Time Slots
                  </label>
                  {!isAddingSlot && (
                    <button
                      type="button"
                      onClick={() => setIsAddingSlot(true)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#2563eb",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      <Plus size={13} /> Add Slot
                    </button>
                  )}
                </div>

                {isAddingSlot && (
                  <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.5rem" }}>
                    <input
                      type="text"
                      placeholder="e.g. AFTERNOON_TEA"
                      value={newSlotInput}
                      onChange={(e) => setNewSlotInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSlot();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: "0.35rem 0.6rem",
                        borderRadius: "4px",
                        border: "1px solid #93c5fd",
                        fontSize: "0.82rem",
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddSlot}
                      style={{
                        padding: "0.35rem 0.75rem",
                        backgroundColor: "#2563eb",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingSlot(false);
                        setNewSlotInput("");
                      }}
                      style={{
                        padding: "0.35rem 0.5rem",
                        backgroundColor: "#f4f4f5",
                        border: "1px solid #d4d4d8",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
                  {availableSlots.map((slot) => {
                    const checked = selectedSlots.includes(slot);
                    return (
                      <div
                        key={slot}
                        onClick={() =>
                          setSelectedSlots((prev) =>
                            checked ? prev.filter((s) => s !== slot) : [...prev, slot]
                          )
                        }
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.3rem 0.65rem",
                          borderRadius: "6px",
                          border: checked ? "1px solid #18181b" : "1px solid #d4d4d8",
                          backgroundColor: checked ? "#18181b" : "#ffffff",
                          color: checked ? "#ffffff" : "#52525b",
                          fontSize: "0.82rem",
                          cursor: "pointer",
                          userSelect: "none",
                        }}
                      >
                        <span>{slot}</span>
                        <span
                          onClick={(e) => handleDeleteSlot(slot, e)}
                          title={`Delete slot "${slot}"`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "14px",
                            height: "14px",
                            borderRadius: "50%",
                            marginLeft: "0.2rem",
                            color: checked ? "#d4d4d8" : "#a1a1aa",
                            cursor: "pointer",
                          }}
                        >
                          <X size={12} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* FUNCTION TYPES (Dynamic Add, Select, Delete) */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>
                    Function Types
                  </label>
                  {!isAddingFunction && (
                    <button
                      type="button"
                      onClick={() => setIsAddingFunction(true)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#b45309",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      <Plus size={13} /> Add Function Type
                    </button>
                  )}
                </div>

                {isAddingFunction && (
                  <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.5rem" }}>
                    <input
                      type="text"
                      placeholder="e.g. SANGEET or BABY_SHOWER"
                      value={newFunctionInput}
                      onChange={(e) => setNewFunctionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddFunction();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: "0.35rem 0.6rem",
                        borderRadius: "4px",
                        border: "1px solid #fde047",
                        fontSize: "0.82rem",
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddFunction}
                      style={{
                        padding: "0.35rem 0.75rem",
                        backgroundColor: "#d97706",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingFunction(false);
                        setNewFunctionInput("");
                      }}
                      style={{
                        padding: "0.35rem 0.5rem",
                        backgroundColor: "#f4f4f5",
                        border: "1px solid #d4d4d8",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
                  {availableFunctions.map((fn) => {
                    const checked = selectedFunctions.includes(fn);
                    return (
                      <div
                        key={fn}
                        onClick={() =>
                          setSelectedFunctions((prev) =>
                            checked ? prev.filter((f) => f !== fn) : [...prev, fn]
                          )
                        }
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.3rem 0.65rem",
                          borderRadius: "6px",
                          border: checked ? "1px solid #d4af37" : "1px solid #d4d4d8",
                          backgroundColor: checked ? "#fef9c3" : "#ffffff",
                          color: checked ? "#854d0e" : "#52525b",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          userSelect: "none",
                        }}
                      >
                        <span>{fn}</span>
                        <span
                          onClick={(e) => handleDeleteFunction(fn, e)}
                          title={`Delete function type "${fn}"`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "14px",
                            height: "14px",
                            borderRadius: "50%",
                            marginLeft: "0.2rem",
                            color: checked ? "#a16207" : "#a1a1aa",
                            cursor: "pointer",
                          }}
                        >
                          <X size={12} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setHallModalOpen(false)}
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
                  {isSubmitting ? "Saving..." : "Save Hall"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CATERING COMBO & VOLUME PRICING MATRIX */}
      {comboModalOpen && (
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
              maxWidth: "600px",
              maxHeight: "92vh",
              overflowY: "auto",
              padding: "1.75rem",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem", color: "#18181b" }}>
              {editingCombo ? "Edit Catering Combo" : "Add Catering Combo & Tier Matrix"}
            </h3>

            <form onSubmit={saveCombo} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>Combo Package Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal South Indian Feast"
                    value={comboName}
                    onChange={(e) => setComboName(e.target.value)}
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
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>Meal Type</label>
                  <select
                    value={comboMealType}
                    onChange={(e) => setComboMealType(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      borderRadius: "6px",
                      border: "1px solid #d4d4d8",
                      marginTop: "0.25rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    <option value="BREAKFAST">BREAKFAST</option>
                    <option value="LUNCH">LUNCH</option>
                    <option value="DINNER">DINNER</option>
                    <option value="HIGH_TEA">HIGH_TEA</option>
                    <option value="SNACKS">SNACKS</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>Base Price Per Pax (₹) *</label>
                <input
                  type="number"
                  required
                  value={comboBasePrice}
                  onChange={(e) => setComboBasePrice(Number(e.target.value))}
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
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3f3f46" }}>Menu Items (comma-separated)</label>
                <textarea
                  rows={3}
                  value={comboItemsInput}
                  onChange={(e) => setComboItemsInput(e.target.value)}
                  placeholder="Idli, Medu Vada, Poori Masala, Pongal, Filter Coffee"
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: "6px",
                    border: "1px solid #d4d4d8",
                    marginTop: "0.25rem",
                    fontSize: "0.88rem",
                  }}
                />
              </div>

              {/* Volume Pricing Matrix Editor */}
              <div style={{ backgroundColor: "#fafafa", borderRadius: "8px", padding: "1rem", border: "1px solid #e4e4e7" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#18181b" }}>
                    Tiered Volume Pricing Matrix
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPricingTiers((prev) => [
                        ...prev,
                        { minPax: 100, maxPax: 200, pricePerPax: comboBasePrice },
                      ])
                    }
                    style={{
                      fontSize: "0.78rem",
                      padding: "0.25rem 0.6rem",
                      backgroundColor: "#f4f4f5",
                      border: "1px solid #d4d4d8",
                      borderRadius: "4px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                  >
                    <Plus size={14} /> Add Tier
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {pricingTiers.map((tier, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1.2fr auto",
                        gap: "0.5rem",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: "0.75rem", color: "#71717a" }}>Min Pax</span>
                        <input
                          type="number"
                          value={tier.minPax}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setPricingTiers((prev) =>
                              prev.map((t, i) => (i === idx ? { ...t, minPax: val } : t))
                            );
                          }}
                          style={{
                            width: "100%",
                            padding: "0.4rem",
                            borderRadius: "4px",
                            border: "1px solid #d4d4d8",
                            fontSize: "0.85rem",
                          }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: "0.75rem", color: "#71717a" }}>Max Pax (Blank for +)</span>
                        <input
                          type="number"
                          placeholder="No Limit"
                          value={tier.maxPax ?? ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : Number(e.target.value);
                            setPricingTiers((prev) =>
                              prev.map((t, i) => (i === idx ? { ...t, maxPax: val } : t))
                            );
                          }}
                          style={{
                            width: "100%",
                            padding: "0.4rem",
                            borderRadius: "4px",
                            border: "1px solid #d4d4d8",
                            fontSize: "0.85rem",
                          }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: "0.75rem", color: "#71717a" }}>Price / Pax (₹)</span>
                        <input
                          type="number"
                          value={tier.pricePerPax}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setPricingTiers((prev) =>
                              prev.map((t, i) => (i === idx ? { ...t, pricePerPax: val } : t))
                            );
                          }}
                          style={{
                            width: "100%",
                            padding: "0.4rem",
                            borderRadius: "4px",
                            border: "1px solid #d4d4d8",
                            fontSize: "0.85rem",
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setPricingTiers((prev) => prev.filter((_, i) => i !== idx))}
                        style={{
                          marginTop: "1rem",
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setComboModalOpen(false)}
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
                  {isSubmitting ? "Saving..." : "Save Combo & Tiers"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
