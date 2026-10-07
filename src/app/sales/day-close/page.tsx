import React from "react";
import { DayCloseClient } from "./DayCloseClient";
import { KalkiPageHeader } from "@/components/ui/KalkiPageHeader";

export const metadata = {
  title: "End of Day Close | Kalki BOS",
};

export default function DayClosePage() {
  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      <KalkiPageHeader
        title="End of Day Close"
        subtitle="Perform blind cash declarations and lock the daily financial summary."
      />
      <div style={{ marginTop: "2rem" }}>
        <DayCloseClient />
      </div>
    </div>
  );
}
