"use client";

import React, { useState } from "react";
import { CheckCircle, Save, AlertCircle, Loader2 } from "lucide-react";

export interface RoutineStockAssessmentFormProps {
  organizationId: string;
  locationId: string;
  vendorId: string;
  vendorName: string;
  items: {
    id: string; // vendorItemId
    itemId: string; // core item id
    itemName: string;
    unitOfMeasure: string;
  }[];
  onSuccess?: () => void;
}

export default function RoutineStockAssessmentForm({
  organizationId,
  locationId,
  vendorId,
  vendorName,
  items,
  onSuccess,
}: RoutineStockAssessmentFormProps) {
  const [stockEntries, setStockEntries] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (itemId: string, value: string) => {
    setStockEntries((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Map stockEntries to the payload format
      const stockData = Object.entries(stockEntries)
        .filter(([_, currentStock]) => currentStock !== "")
        .map(([itemId, currentStock]) => ({
          itemId,
          currentStock: Number(currentStock),
        }));

      if (stockData.length === 0) {
        throw new Error("Please enter stock for at least one item.");
      }

      const res = await fetch("/api/kuab/purchasing-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          locationId,
          vendorId,
          stockData,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit stock assessment.");

      setSuccess(true);
      if (onSuccess) {
        setTimeout(() => onSuccess(), 2000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-green-50 rounded-xl border border-green-200">
        <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
        <h3 className="text-xl font-bold text-green-900">Assessment Complete</h3>
        <p className="text-green-700 mt-2 text-center">
          The Universal Automation Bus has successfully received your stock counts. PO calculations are running in the background.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-6 py-5 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-900">Daily Routine Stock Assessment</h2>
        <p className="text-sm text-slate-500 mt-1">Vendor: <span className="font-semibold text-slate-700">{vendorName}</span></p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-4 pb-2 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <div className="col-span-7 md:col-span-8">Item Name</div>
            <div className="col-span-5 md:col-span-4 text-right">Available Stock</div>
          </div>
          
          {items.length === 0 ? (
            <p className="text-sm text-slate-500 italic py-4">No predefined items configured for this vendor.</p>
          ) : (
            items.map((item) => (
              <div key={item.itemId} className="grid grid-cols-12 gap-4 items-center group hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors">
                <div className="col-span-7 md:col-span-8 flex flex-col pl-2">
                  <span className="text-sm font-medium text-slate-900">{item.itemName}</span>
                </div>
                <div className="col-span-5 md:col-span-4 flex items-center justify-end gap-2 pr-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full max-w-[120px] text-right rounded-lg border-slate-200 text-sm focus:border-indigo-500 focus:ring-indigo-500 shadow-sm"
                    value={stockEntries[item.itemId] || ""}
                    onChange={(e) => handleInputChange(item.itemId, e.target.value)}
                  />
                  <span className="text-xs text-slate-500 font-medium w-8 text-right">{item.unitOfMeasure}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 pt-5 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || items.length === 0}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Submit Assessment
          </button>
        </div>
      </form>
    </div>
  );
}
