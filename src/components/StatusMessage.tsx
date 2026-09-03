"use client";

export function StatusMessage({
  tone,
  children,
}: {
  tone: "error" | "empty" | "loading";
  children: string;
}) {
  return <p className={`status status-${tone}`} role={tone === "error" ? "alert" : "status"}>{children}</p>;
}
