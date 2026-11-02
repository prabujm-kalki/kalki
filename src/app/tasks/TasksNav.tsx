"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CheckSquare, ShieldCheck, History, Settings2 } from "lucide-react";

export function TasksNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";

  return (
    <nav className="kalki-module-topbar">
      <Link 
        href={`/tasks${qs}`} 
        className={`kalki-module-link ${pathname === "/tasks" ? "active" : ""}`}
      >
        <CheckSquare size={16} />
        Routines &amp; Queue
      </Link>
      <Link 
        href={`/tasks/audit${qs}`} 
        className={`kalki-module-link ${pathname === "/tasks/audit" ? "active" : ""}`}
      >
        <ShieldCheck size={16} />
        Supervisor Audit
      </Link>
      <Link 
        href={`/tasks/history${qs}`} 
        className={`kalki-module-link ${pathname === "/tasks/history" ? "active" : ""}`}
      >
        <History size={16} />
        History &amp; Compliance
      </Link>
      <Link 
        href={`/tasks/configure${qs}`} 
        className={`kalki-module-link ${pathname === "/tasks/configure" ? "active" : ""}`}
      >
        <Settings2 size={16} />
        Configuration
      </Link>
    </nav>
  );
}

