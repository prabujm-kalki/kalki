import { SalesReturns } from "@/components/sales/SalesReturns";

export default function Page() { 
  return (
    <div className="flex-1 w-full flex flex-col bg-slate-50 min-h-[calc(100vh-140px)]">
      <SalesReturns />
    </div>
  ); 
}