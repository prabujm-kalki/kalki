"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  Calendar,
  User,
  Percent,
  UserPlus,
  X,
  Check,
  Printer,
  FileDown,
} from "lucide-react";
import { createQuotation } from "../actions";
import { fetchCustomers, fetchItems, addCustomer } from "@/app/sales/actions";
import { getQuotationSettings } from "@/app/sales/settings/quotations/actions";
import { getPricingTierSettings } from "@/app/settings/master-data/pricing-actions";
import {
  buildQuotationWhatsappMessage,
  formatIndianCurrency,
} from "@/lib/whatsapp-quotation";
import { QuotationWhatsAppModal } from "@/components/sales/QuotationWhatsAppModal";
import { CustomerSearchSelect, CustomerItem } from "@/components/sales/CustomerSearchSelect";

interface FormLine {
  id: string;
  itemId: string;
  itemName: string;
  hsnCode: string;
  uom: string;
  quantity: number;
  unitRate: number;
  discountPercent: number;
  gstRate: number;
}

export default function NewQuotationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("organizationId");
  const locId = searchParams.get("locationId");
  const query = orgId && locId ? `?organizationId=${orgId}&locationId=${locId}` : "";

  // Master Data
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [itemList, setItemList] = useState<any[]>([]);
  const [itemCategoryFilter, setItemCategoryFilter] = useState<"PRODUCT" | "RAW_MATERIAL" | "ALL">("PRODUCT");
  const [pricingConfig, setPricingConfig] = useState<any>(null);
  const [selectedPricingTier, setSelectedPricingTier] = useState<string>("tier1");
  const [loadingMasters, setLoadingMasters] = useState(true);

  // Form State
  const [docType, setDocType] = useState<"QUOTATION" | "PROFORMA" | "DUMMY">("QUOTATION");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerGstin, setCustomerGstin] = useState<string>("");
  const [billingAddress, setBillingAddress] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [validUntil, setValidUntil] = useState<string>(
    new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0]
  );
  const [paymentTerms, setPaymentTerms] = useState<string>("Payment within 15 days of invoice");
  const [notes, setNotes] = useState<string>("Thank you for your business inquiry!");
  const [termsAndConditions, setTermsAndConditions] = useState<string>(
    "1. Goods once sold will be accepted under warranty policy.\n2. Rates quoted are valid until the validity date specified.\n3. Taxes as applicable at time of invoicing."
  );
  const [orgDispatchMode, setOrgDispatchMode] = useState<"NO_WHATSAPP" | "API_AUTOMATED" | "WEB_LINK_POPUP">("WEB_LINK_POPUP");

  // Quick Add Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustGstin, setNewCustGstin] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [addingCustomer, setAddingCustomer] = useState(false);

  // Line items state
  const [lines, setLines] = useState<FormLine[]>([
    {
      id: "line-1",
      itemId: "",
      itemName: "",
      hsnCode: "",
      uom: "Unit",
      quantity: 1,
      unitRate: 0,
      discountPercent: 0,
      gstRate: 5,
    },
  ]);

  const [saving, setSaving] = useState(false);

  // WhatsApp Prompt modal after generation
  const [whatsAppModal, setWhatsAppModal] = useState<{
    quotationNumber: string;
    docType: string;
    totalAmount: number | string;
    customerName: string;
    customerPhone: string;
    whatsappUrl: string;
    quotationId: string;
    messagePreview: string;
  } | null>(null);

  // Load Customers, Inventory items, and Configured Organization Settings
  useEffect(() => {
    async function loadMasters() {
      if (!orgId) return;
      try {
        const [cList, iList, orgSettings, pConfig] = await Promise.all([
          fetchCustomers(orgId),
          locId ? fetchItems(orgId, locId, "", itemCategoryFilter) : Promise.resolve([]),
          getQuotationSettings(orgId),
          getPricingTierSettings(orgId),
        ]);
        setCustomerList(cList || []);
        setItemList(iList || []);

        if (pConfig) {
          setPricingConfig(pConfig);
          if (pConfig.defaultPricingTier) {
            setSelectedPricingTier(pConfig.defaultPricingTier);
          }
        }

        if (orgSettings) {
          if (orgSettings.defaultPaymentTerms) setPaymentTerms(orgSettings.defaultPaymentTerms);
          if (orgSettings.defaultNotes) setNotes(orgSettings.defaultNotes);
          if (orgSettings.defaultTermsAndConditions) setTermsAndConditions(orgSettings.defaultTermsAndConditions);
          if (orgSettings.whatsappDispatchMode) setOrgDispatchMode(orgSettings.whatsappDispatchMode);
          if (orgSettings.defaultValidityDays) {
            const expDate = new Date(Date.now() + orgSettings.defaultValidityDays * 86400000)
              .toISOString()
              .split("T")[0];
            setValidUntil(expDate);
          }
        }
      } catch (err) {
        console.error("Failed loading master data or quotation settings", err);
      } finally {
        setLoadingMasters(false);
      }
    }
    loadMasters();
  }, [orgId, locId, itemCategoryFilter]);

  // Customer selection change
  const handleCustomerChange = (cId: string) => {
    setSelectedCustomerId(cId);
    const found = customerList.find((c) => c.id === cId);
    if (found) {
      setCustomerName(found.name || "");
      setCustomerPhone(found.phone || "");
      setCustomerGstin(found.taxId || "");
      setBillingAddress(found.address || "");
    } else {
      setCustomerName("");
      setCustomerPhone("");
      setCustomerGstin("");
      setBillingAddress("");
    }
  };

  // Quick Add Customer Handler
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    if (!newCustName.trim()) {
      alert("Please provide customer name");
      return;
    }

    setAddingCustomer(true);
    try {
      const created = await addCustomer(orgId, {
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        gstin: newCustGstin.trim(),
        email: newCustEmail.trim(),
        address: newCustAddress.trim(),
      });

      if (created) {
        // Refresh and auto-select
        setCustomerList((prev) => [created, ...prev]);
        setSelectedCustomerId(created.id);
        setCustomerName(created.name);
        setCustomerPhone(created.phone || "");
        setCustomerGstin(created.taxId || "");
        setBillingAddress(created.address || "");

        // Reset modal form
        setNewCustName("");
        setNewCustPhone("");
        setNewCustGstin("");
        setNewCustEmail("");
        setNewCustAddress("");
        setShowAddCustomerModal(false);
      }
    } catch (err: any) {
      alert(err.message || "Failed to create customer");
    } finally {
      setAddingCustomer(false);
    }
  };

  // Add line item
  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        id: `line-${Date.now()}`,
        itemId: "",
        itemName: "",
        hsnCode: "",
        uom: "Unit",
        quantity: 1,
        unitRate: 0,
        discountPercent: 0,
        gstRate: 5,
      },
    ]);
  };

  // Remove line item
  const handleRemoveLine = (idx: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  // Helper: Get item rate based on tier
  const getItemRateForTier = (item: any, tier: string) => {
    if (!item) return 0;
    const tiers = item.tierPrices || {};
    if (tiers[tier] !== undefined && tiers[tier] !== "" && Number(tiers[tier]) > 0) {
      return Number(tiers[tier]);
    }
    // Fallbacks
    if (tiers.tier1 && Number(tiers.tier1) > 0) return Number(tiers.tier1);
    return Number(item.sellingPrice || item.currentPrice || item.costPrice || 0);
  };

  // Change tier for the entire bill
  const handleBillTierChange = (newTier: string) => {
    setSelectedPricingTier(newTier);
    // Recalculate all lines with items using this new tier
    const updated = lines.map((l) => {
      if (!l.itemId) return l;
      const matched = itemList.find((item) => item.id === l.itemId);
      if (matched) {
        return {
          ...l,
          unitRate: getItemRateForTier(matched, newTier),
        };
      }
      return l;
    });
    setLines(updated);
  };

  // Line item change
  const handleLineChange = (idx: number, field: keyof FormLine, value: any) => {
    const updated = [...lines];
    const line = { ...updated[idx], [field]: value };

    // Auto-fill item details if product selected
    if (field === "itemId") {
      const selectedItem = itemList.find((item) => item.id === value);
      if (selectedItem) {
        line.itemName = selectedItem.nameEn || selectedItem.nameTa || "";
        line.hsnCode = selectedItem.hsnCode || "";
        line.uom = selectedItem.uom || selectedItem.unit || "Unit";
        line.unitRate = getItemRateForTier(selectedItem, selectedPricingTier);
        line.gstRate = Number(selectedItem.gstRate || 5);
      }
    }

    updated[idx] = line;
    setLines(updated);
  };

  // Compute live calculations
  let subtotal = 0;
  let discountTotal = 0;
  let taxableTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;

  lines.forEach((l) => {
    const qty = Number(l.quantity || 0);
    const rate = Number(l.unitRate || 0);
    const gross = qty * rate;
    const discPct = Number(l.discountPercent || 0);
    const discAmount = (gross * discPct) / 100;
    const taxable = Math.max(0, gross - discAmount);
    const gst = Number(l.gstRate || 0);
    const cgst = (taxable * (gst / 2)) / 100;
    const sgst = (taxable * (gst / 2)) / 100;

    subtotal += gross;
    discountTotal += discAmount;
    taxableTotal += taxable;
    cgstTotal += cgst;
    sgstTotal += sgst;
  });

  const grandTotal = Math.round(taxableTotal + cgstTotal + sgstTotal);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !locId) {
      alert("Missing Organization or Location context");
      return;
    }
    if (!selectedCustomerId || !customerName) {
      alert("Please select or enter customer details");
      return;
    }
    const validLines = lines.filter((l) => l.itemId && Number(l.quantity) > 0);
    if (validLines.length === 0) {
      alert("Please add at least one line item with valid product and quantity.");
      return;
    }

    setSaving(true);
    const res = await createQuotation({
      organizationId: orgId,
      locationId: locId,
      docType,
      customerId: selectedCustomerId,
      customerName,
      customerPhone,
      customerGstin,
      billingAddress,
      issueDate,
      validUntil,
      paymentTerms,
      notes,
      termsAndConditions,
      lines: validLines,
    });
    setSaving(false);

    if (res.success && res.data) {
      const quote = res.data;

      // Check organization WhatsApp dispatch policy
      if (quote.whatsappDispatchMode === "NO_WHATSAPP") {
        // Direct navigation to quotation details with print/PDF access
        router.push(`/sales/quotations/${quote.id}${query}`);
        return;
      }

      // If WEB_LINK_POPUP or API_AUTOMATED:
      const { whatsappUrl, text } = buildQuotationWhatsappMessage({
        quotationNumber: quote.quotationNumber,
        docType: quote.docType,
        totalAmount: quote.grandTotal,
        publicToken: quote.publicToken,
        customerName: quote.customerName,
        customerPhone: quote.customerPhone,
        validUntil: quote.validUntil,
        lines: validLines,
      });

      setWhatsAppModal({
        quotationNumber: quote.quotationNumber,
        docType: quote.docType,
        totalAmount: quote.grandTotal,
        customerName: quote.customerName,
        customerPhone: quote.customerPhone || "",
        whatsappUrl,
        quotationId: quote.id,
        messagePreview: text,
      });
    } else {
      alert(res.error || "Failed to create quotation");
    }
  };

  return (
    <div style={{ maxWidth: "1050px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* Top Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link
            href={`/sales/quotations${query}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "34px",
              height: "34px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#475569",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
              Create New {docType === "PROFORMA" ? "Proforma Invoice" : docType === "DUMMY" ? "Dummy Bill" : "Quotation"}
            </h1>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
              {docType === "DUMMY" ? "Dummy estimate / credit tempi bill with exact same details & template" : "Commercial estimate with rate editing and instant WhatsApp dispatch"}
            </p>
          </div>
        </div>

        {/* Document Type Selector Toggle */}
        <div style={{ display: "flex", backgroundColor: "#e2e8f0", padding: "3px", borderRadius: "8px" }}>
          <button
            type="button"
            onClick={() => setDocType("QUOTATION")}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: "none",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: docType === "QUOTATION" ? "#ffffff" : "transparent",
              color: docType === "QUOTATION" ? "#0f172a" : "#64748b",
              boxShadow: docType === "QUOTATION" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
            }}
          >
            Sales Quotation
          </button>
          <button
            type="button"
            onClick={() => setDocType("PROFORMA")}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: "none",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: docType === "PROFORMA" ? "#ffffff" : "transparent",
              color: docType === "PROFORMA" ? "#0f172a" : "#64748b",
              boxShadow: docType === "PROFORMA" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
            }}
          >
            Proforma Invoice
          </button>
          <button
            type="button"
            onClick={() => setDocType("DUMMY")}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: "none",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: docType === "DUMMY" ? "#ffffff" : "transparent",
              color: docType === "DUMMY" ? "#0f172a" : "#64748b",
              boxShadow: docType === "DUMMY" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
            }}
          >
            Dummy Bill
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Customer & Document Information */}
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
              Customer & Header Details
            </h2>
            <Link
              href={`/sales/settings/quotations${query}`}
              target="_blank"
              style={{
                fontSize: "12px",
                color: "#2563eb",
                fontWeight: "600",
                textDecoration: "none",
              }}
            >
              Configure Default Notes & Terms ↗
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "16px" }}>
            {/* Customer Search & Select Component */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", margin: 0 }}>
                  Select Customer *
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(true)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#2563eb",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    padding: 0,
                  }}
                >
                  <UserPlus size={13} /> + Add Customer
                </button>
              </div>
              <CustomerSearchSelect
                organizationId={orgId || ""}
                selectedCustomerId={selectedCustomerId}
                onSelectCustomer={(cust) => {
                  if (cust) {
                    setSelectedCustomerId(cust.id);
                    setCustomerName(cust.name);
                    setCustomerPhone(cust.phone || "");
                    setCustomerGstin(cust.taxId || "");
                    setBillingAddress(cust.address || "");
                  } else {
                    setSelectedCustomerId("");
                    setCustomerName("");
                    setCustomerPhone("");
                    setCustomerGstin("");
                    setBillingAddress("");
                  }
                }}
                onAddNewCustomerClick={() => setShowAddCustomerModal(true)}
              />
            </div>

            {/* Customer Name */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                Customer / Company Name *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                placeholder="Client Name"
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
            </div>

            {/* Customer Phone */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                {orgDispatchMode === "NO_WHATSAPP" ? "Customer Contact / Mobile" : "WhatsApp Mobile Number *"}
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="10-digit mobile (e.g. 9876543210)"
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
            </div>

            {/* Customer GSTIN */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                Customer GSTIN
              </label>
              <input
                type="text"
                value={customerGstin}
                onChange={(e) => setCustomerGstin(e.target.value)}
                placeholder="33AAAAA0000A1Z5"
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            {/* Issue Date */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                Issue Date *
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
            </div>

            {/* Valid Until */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                Valid Until (Expiry Date)
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
            </div>

            {/* Payment Terms */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                Payment Terms
              </label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g. 50% advance, balance on delivery"
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
            </div>

            {/* Billing Address */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                Billing Address
              </label>
              <input
                type="text"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="City, State, Pincode"
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
            </div>
          </div>
        </div>

        {/* Line Items & Rate Editing */}
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                {docType === "DUMMY" ? "Dummy Bill Items & Rates" : "Quotation Line Items & Rates"}
              </h2>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                Select products, edit negotiated rates, apply discounts and GST
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              {/* Item Category Toggle */}
              <div style={{ display: "inline-flex", background: "#f1f5f9", padding: "3px", borderRadius: "8px", border: "1px solid #cbd5e1", gap: "2px" }}>
                <button
                  type="button"
                  onClick={() => setItemCategoryFilter("PRODUCT")}
                  style={{
                    padding: "4px 10px",
                    fontSize: "12px",
                    fontWeight: itemCategoryFilter === "PRODUCT" ? 600 : 500,
                    borderRadius: "5px",
                    border: "none",
                    cursor: "pointer",
                    background: itemCategoryFilter === "PRODUCT" ? "#ffffff" : "transparent",
                    color: itemCategoryFilter === "PRODUCT" ? "#1e293b" : "#64748b",
                    boxShadow: itemCategoryFilter === "PRODUCT" ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  🛍️ Products & Services
                </button>
                <button
                  type="button"
                  onClick={() => setItemCategoryFilter("RAW_MATERIAL")}
                  style={{
                    padding: "4px 10px",
                    fontSize: "12px",
                    fontWeight: itemCategoryFilter === "RAW_MATERIAL" ? 600 : 500,
                    borderRadius: "5px",
                    border: "none",
                    cursor: "pointer",
                    background: itemCategoryFilter === "RAW_MATERIAL" ? "#ffffff" : "transparent",
                    color: itemCategoryFilter === "RAW_MATERIAL" ? "#1e293b" : "#64748b",
                    boxShadow: itemCategoryFilter === "RAW_MATERIAL" ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  🌾 Raw Materials
                </button>
                <button
                  type="button"
                  onClick={() => setItemCategoryFilter("ALL")}
                  style={{
                    padding: "4px 10px",
                    fontSize: "12px",
                    fontWeight: itemCategoryFilter === "ALL" ? 600 : 500,
                    borderRadius: "5px",
                    border: "none",
                    cursor: "pointer",
                    background: itemCategoryFilter === "ALL" ? "#ffffff" : "transparent",
                    color: itemCategoryFilter === "ALL" ? "#1e293b" : "#64748b",
                    boxShadow: itemCategoryFilter === "ALL" ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  📦 All Items
                </button>
              </div>

              {/* Entire Bill Pricing Tier Selector */}
              {(pricingConfig?.multiPricingEnabled ?? true) && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#f8fafc", padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Bill Pricing Tier:</span>
                  <select
                    value={selectedPricingTier}
                    onChange={(e) => handleBillTierChange(e.target.value)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "1px solid #94a3b8",
                      fontSize: "12px",
                      fontWeight: 600,
                      backgroundColor: "#ffffff",
                      color: "#0f172a",
                      cursor: "pointer",
                    }}
                  >
                    <option value="tier1">{pricingConfig?.pricingTiers?.tier1 || "Retail / Customer"} (Tier 1)</option>
                    <option value="tier2">{pricingConfig?.pricingTiers?.tier2 || "Wholesale Supplies"} (Tier 2)</option>
                    <option value="tier3">{pricingConfig?.pricingTiers?.tier3 || "Dealers"} (Tier 3)</option>
                    <option value="tier4">{pricingConfig?.pricingTiers?.tier4 || "Special / Tier 4"} (Tier 4)</option>
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={handleAddLine}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#f8fafc",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Plus size={14} /> Add Line Item
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "750px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontSize: "12px", color: "#475569", width: "30%" }}>Item / Product *</th>
                  <th style={{ textAlign: "center", padding: "8px 10px", fontSize: "12px", color: "#475569", width: "10%" }}>UOM</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontSize: "12px", color: "#475569", width: "10%" }}>Quantity *</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontSize: "12px", color: "#475569", width: "14%" }}>Unit Rate (₹) *</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontSize: "12px", color: "#475569", width: "10%" }}>Disc %</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontSize: "12px", color: "#475569", width: "10%" }}>GST %</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontSize: "12px", color: "#475569", width: "12%" }}>Total (₹)</th>
                  <th style={{ width: "4%" }}></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const qty = Number(line.quantity || 0);
                  const rate = Number(line.unitRate || 0);
                  const gross = qty * rate;
                  const disc = (gross * Number(line.discountPercent || 0)) / 100;
                  const taxable = Math.max(0, gross - disc);
                  const gst = (taxable * Number(line.gstRate || 0)) / 100;
                  const rowTotal = taxable + gst;

                  return (
                    <tr key={line.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 6px" }}>
                        <select
                          value={line.itemId}
                          onChange={(e) => handleLineChange(idx, "itemId", e.target.value)}
                          required
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "5px",
                            border: "1px solid #cbd5e1",
                            fontSize: "12.5px",
                            backgroundColor: "#ffffff",
                          }}
                        >
                          <option value="">-- Select Product --</option>
                          {itemList.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.nameEn || it.nameTa} {it.sku ? `(${it.sku})` : ""}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <input
                          type="text"
                          value={line.uom}
                          onChange={(e) => handleLineChange(idx, "uom", e.target.value)}
                          style={{ width: "100%", padding: "6px 8px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "12.5px", textAlign: "center" }}
                        />
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={line.quantity}
                          onChange={(e) => handleLineChange(idx, "quantity", e.target.value === "" ? 0 : Number(e.target.value))}
                          required
                          style={{ width: "100%", padding: "6px 8px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "12.5px", textAlign: "right" }}
                        />
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={line.unitRate}
                          onChange={(e) => handleLineChange(idx, "unitRate", e.target.value === "" ? 0 : Number(e.target.value))}
                          required
                          style={{ width: "100%", padding: "6px 8px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "12.5px", textAlign: "right", fontWeight: 600 }}
                        />
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          value={line.discountPercent}
                          onChange={(e) => handleLineChange(idx, "discountPercent", e.target.value === "" ? 0 : Number(e.target.value))}
                          style={{ width: "100%", padding: "6px 8px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "12.5px", textAlign: "right" }}
                        />
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <select
                          value={line.gstRate}
                          onChange={(e) => handleLineChange(idx, "gstRate", Number(e.target.value))}
                          style={{ width: "100%", padding: "6px 6px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "12.5px", textAlign: "right" }}
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: "700", color: "#0f172a", fontSize: "13px" }}>
                        ₹{rowTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "8px 4px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={lines.length === 1}
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: lines.length === 1 ? "not-allowed" : "pointer",
                            color: lines.length === 1 ? "#cbd5e1" : "#ef4444",
                            padding: "4px",
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
            <div style={{ width: "320px", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
              <div style={{ padding: "8px 12px", display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#64748b" }}>
                <span>Gross Subtotal:</span>
                <span>₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              {discountTotal > 0 && (
                <div style={{ padding: "8px 12px", display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#dc2626" }}>
                  <span>Discount Total:</span>
                  <span>-₹{discountTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div style={{ padding: "8px 12px", display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#64748b" }}>
                <span>Taxable Amount:</span>
                <span>₹{taxableTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ padding: "8px 12px", display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#64748b" }}>
                <span>GST (CGST + SGST):</span>
                <span>₹{(cgstTotal + sgstTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: "800", color: "#0f172a", backgroundColor: "#f8fafc" }}>
                <span>Grand Total:</span>
                <span style={{ color: "#16a34a" }}>₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          <div style={{ backgroundColor: "#ffffff", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", margin: 0 }}>
                Quotation Notes
              </label>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>Configured via Settings</span>
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", resize: "vertical" }}
            />
          </div>

          <div style={{ backgroundColor: "#ffffff", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", margin: 0 }}>
                Terms & Conditions
              </label>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>Configured via Settings</span>
            </div>
            <textarea
              rows={3}
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", resize: "vertical" }}
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <Link
            href={`/sales/quotations${query}`}
            style={{
              padding: "9px 18px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#475569",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 22px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(37, 99, 235, 0.25)",
            }}
          >
            {saving ? (
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            ) : orgDispatchMode === "NO_WHATSAPP" ? (
              <Save size={16} />
            ) : (
              <Save size={16} />
            )}
            {orgDispatchMode === "NO_WHATSAPP" ? "Save & View Document" : "Save & Prepare WhatsApp"}
          </button>
        </div>
      </form>

      {/* Quick Add Customer Modal */}
      {showAddCustomerModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddCustomerModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "460px",
              overflow: "hidden",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <UserPlus size={18} style={{ color: "#2563eb" }} />
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
                  Add New Customer
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} style={{ padding: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    Customer / Company Name *
                  </label>
                  <input
                    type="text"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    required
                    placeholder="e.g. Royal Sweets Ltd"
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    WhatsApp Mobile Number *
                  </label>
                  <input
                    type="text"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    required
                    placeholder="e.g. 9876543210"
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    GSTIN
                  </label>
                  <input
                    type="text"
                    value={newCustGstin}
                    onChange={(e) => setNewCustGstin(e.target.value)}
                    placeholder="33AAAAA0000A1Z5"
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    Billing Address
                  </label>
                  <textarea
                    rows={2}
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                    placeholder="Street, City, Pincode"
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "13px", resize: "vertical" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#475569",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingCustomer}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 16px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {addingCustomer ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
                  Add & Auto-Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Instant WhatsApp popup after creation */}
      {whatsAppModal && (
        <QuotationWhatsAppModal
          isOpen={Boolean(whatsAppModal)}
          onClose={() => {
            setWhatsAppModal(null);
            router.push(`/sales/quotations${query}`);
          }}
          onConfirmSent={async () => {
            router.push(`/sales/quotations${query}`);
          }}
          quotationNumber={whatsAppModal.quotationNumber}
          docType={whatsAppModal.docType}
          totalAmount={whatsAppModal.totalAmount}
          customerName={whatsAppModal.customerName}
          customerPhone={whatsAppModal.customerPhone}
          whatsappUrl={whatsAppModal.whatsappUrl}
          messagePreview={whatsAppModal.messagePreview}
          isAlreadySent={false}
        />
      )}
    </div>
  );
}
