"use client";

import dynamic from "next/dynamic";

const KioskClient = dynamic(() => import("./KioskClient"), { ssr: false });

export default function SelfiePunchPage() {
  return <KioskClient />;
}
