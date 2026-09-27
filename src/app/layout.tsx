import type { ReactNode } from "react";
import "./globals.css";
import { GlobalAlert } from "@/components/GlobalAlert";

export const metadata = {
  title: "Kalki BOS",
  description: "Kalki Business Operating System",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GlobalAlert />
        {children}
      </body>
    </html>
  );
}
