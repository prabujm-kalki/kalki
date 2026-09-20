"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, Suspense, type ReactNode } from "react";
import { apiGet } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { StatusMessage } from "@/components/StatusMessage";
import type { SessionContext, SessionScope } from "@/components/work/types";
import { ToastProvider } from "./ui/Toast";

function scopeKey(scope: Pick<SessionScope, "organizationId" | "locationId">) {
  return `${scope.organizationId}:${scope.locationId}`;
}

const SessionViewContext = createContext<{
  session: SessionContext;
  selected: SessionScope | null;
} | null>(null);

export function useSessionView() {
  const value = useContext(SessionViewContext);
  if (!value) throw new Error("Session view is unavailable");
  return value;
}

function AppShellContent({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<SessionContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const organizationId = searchParams.get("organizationId");
  const locationId = searchParams.get("locationId");

  useEffect(() => {
    let cancelled = false;
    apiGet<{ session: SessionContext }>("/api/session-context").then((payload) => {
      if (!cancelled) setSession(payload.session);
    }).catch((caught) => {
      if (cancelled) return;
      if ("status" in caught && caught.status === 401) {
        router.replace(`/login?next=${encodeURIComponent(`${pathname}?${searchParams.toString()}`)}`);
        return;
      }
      setError(caught instanceof Error ? caught.message : "Unable to load session");
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, router, searchParams]);

  const selected = useMemo(
    () => session?.scopes.find((scope) => scope.organizationId === organizationId && scope.locationId === locationId) ?? null,
    [locationId, organizationId, session],
  );

  useEffect(() => {
    if (!session || selected || session.scopes.length !== 1) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("organizationId", session.scopes[0].organizationId);
    next.set("locationId", session.scopes[0].locationId);
    router.replace(`${pathname}?${next.toString()}`);
  }, [pathname, router, searchParams, selected, session]);

  function changeScope(value: string) {
    const [nextOrganizationId, nextLocationId] = value.split(":");
    const next = new URLSearchParams();
    next.set("organizationId", nextOrganizationId);
    next.set("locationId", nextLocationId);
    const nextPath = pathname.startsWith("/work/") || pathname === "/work" ? "/work" : pathname;
    router.push(`${nextPath}?${next.toString()}`);
  }

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  if (error) return <div className="kalki-main-wrapper"><main className="kalki-main-content"><StatusMessage tone="error">{error}</StatusMessage></main></div>;
  if (!session) return <div className="kalki-main-wrapper"><main className="kalki-main-content"><StatusMessage tone="loading">Loading session…</StatusMessage></main></div>;

  return (
    <SessionViewContext.Provider value={{ session, selected }}>
      <ToastProvider>
        <div className="kalki-app-shell">
          
          {/* LEFT: Persistent Sidebar */}
          <aside className="kalki-sidebar">
            <div className="kalki-sidebar-header">
              Kalki BOS
            </div>
            
            {selected && (
              <nav className="kalki-sidebar-nav">
                <div style={{ padding: '0 1.25rem 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
                  Modules
                </div>
                {[
                  { label: "Command Center", path: "/reports" },
                  { label: "People", path: "/people" },
                  { label: "Attendance", path: "/attendance" },
                  { label: "Payroll", path: "/payroll" },
                  { label: "Purchasing", path: "/purchasing" },
                  { label: "Inventory", path: "/inventory" },
                  { label: "Sales", path: "/sales" },
                  { label: "CRM", path: "/crm" },
                  { label: "Finance", path: "/finance" },
                  { label: "Settings", path: "/settings" },
                ].map(module => (
                  <Link
                    key={module.path}
                    className="kalki-sidebar-link"
                    data-active={pathname === module.path || pathname.startsWith(`${module.path}/`)}
                    href={`${module.path}?organizationId=${selected.organizationId}&locationId=${selected.locationId}`}
                  >
                    {module.label}
                  </Link>
                ))}
              </nav>
            )}
          </aside>

          {/* MAIN WRAPPER */}
          <div className="kalki-main-wrapper">
            
            {/* TOP: Global Header */}
            <header className="kalki-topbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <select
                  className="kalki-select"
                  style={{ width: 'auto', padding: '0.25rem 2rem 0.25rem 0.75rem', fontSize: '0.85rem' }}
                  value={selected ? scopeKey(selected) : ""}
                  onChange={(event) => changeScope(event.target.value)}
                >
                  <option value="" disabled>Select Location...</option>
                  {session.scopes.map((scope) => (
                    <option key={scopeKey(scope)} value={scopeKey(scope)}>
                      {scope.organizationName} / {scope.locationName}
                    </option>
                  ))}
                </select>
                
                <Link
                  href={selected ? `/work?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : "/work"}
                  style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 1)', textDecoration: 'none' }}
                >
                  Work
                </Link>
                
                {session.isOwner && selected && (
                  <Link
                    href={`/audit?organizationId=${selected.organizationId}&locationId=${selected.locationId}`}
                    style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 1)', textDecoration: 'none' }}
                  >
                    Audit
                  </Link>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 1)' }}>
                  {session.user.name || session.user.email}
                </span>
                <Link href="/me/settings" style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 1)', textDecoration: 'none' }}>
                  Settings
                </Link>
                <button type="button" className="kalki-button kalki-button--ghost kalki-button--sm" style={{ color: 'rgba(255, 255, 255, 1)' }} onClick={() => void signOut()}>
                  Sign out
                </button>
              </div>
            </header>

            {/* CONTENT */}
            <main className="kalki-main-content">
              {session.scopes.length === 0 ? (
                <StatusMessage tone="empty">No authorized organization location is available for this account.</StatusMessage>
              ) : children}
            </main>
          </div>

        </div>
      </ToastProvider>
    </SessionViewContext.Provider>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="kalki-main-wrapper"><main className="kalki-main-content"><StatusMessage tone="loading">Loading...</StatusMessage></main></div>}>
      <AppShellContent>{children}</AppShellContent>
    </Suspense>
  );
}
