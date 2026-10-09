"use client";
import { TMBillConfig } from "@/components/integrations/TMBillConfig";
export default function Page() { 
  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Integration Settings</h1>
        <p className="text-gray-500">Configure external system connections and APIs.</p>
      </div>
      <TMBillConfig />
    </div>
  ); 
}
