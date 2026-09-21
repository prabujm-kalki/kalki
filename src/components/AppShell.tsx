"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, Suspense, type ReactNode } from "react";
import { apiGet } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { StatusMessage } from "@/components/StatusMessage";
import type { SessionContext, SessionScope } from "@/components/work/types";
import { ToastProvider } from "./ui/Toast";
import { Menu, X } from "lucide-react";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const organizationId = searchParams.get("organizationId");
  const locationId = searchParams.get("locationId");

  useEffect(() => {
    let cancelled = false;
    apiGet<{ session: SessionContext }>("/api/session-context").then((payload) => {
      if (!cancelled) setSession(payload.session);
    }).catch((caught) => {
      if (cancelled) return;
      if ("status" in caught && caught.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(`${pathname}?${searchParams.toString()}`)}`;
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
          
          {/* Mobile Overlay */}
          {isMobileMenuOpen && (
            <div 
              className="kalki-sidebar-overlay" 
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}

          {/* LEFT: Persistent Sidebar */}
          <aside className={`kalki-sidebar ${isMobileMenuOpen ? 'kalki-sidebar--mobile-open' : ''}`}>
            <div className="kalki-sidebar-header" style={{ justifyContent: 'space-between' }}>
              <span>Kalki BOS</span>
              <button 
                className="kalki-mobile-only" 
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--kalki-text-primary)' }}
              >
                <X size={20} />
              </button>
            </div>
            
            {selected && (
              <nav className="kalki-sidebar-nav">
                <div style={{ padding: '0 1.25rem 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
                  Modules
                </div>
                {[
                  { label: "Command Center", path: "/reports", module: "command-center" },
                  { label: "People", path: "/people", module: "employee" },
                  { label: "Attendance", path: "/attendance", module: "attendance" },
                  { label: "Payroll", path: "/payroll", module: "payroll" },
                  { label: "Purchasing", path: "/purchasing", module: "purchasing" },
                  { label: "Inventory", path: "/inventory", module: "inventory" },
                  { label: "Sales", path: "/sales", module: "sales" },
                  { label: "CRM", path: "/crm", module: "crm" },
                  { label: "Finance", path: "/finance", module: "finance" },
                  { label: "Settings", path: "/settings", module: "settings" },
                ]
                  .filter(m => {
                    if (session.isOwner) return true;
                    if (!selected) return false;
                    return selected.permissions.some(p => p.startsWith(`${m.module}.`) || p.startsWith(`${m.module}:`));
                  })
                  .map(module => (
                  <Link
                    key={module.path}
                    className="kalki-sidebar-link"
                    data-active={pathname === module.path || pathname.startsWith(`${module.path}/`)}
                    href={`${module.path}?organizationId=${selected.organizationId}&locationId=${selected.locationId}`}
                    onClick={() => setIsMobileMenuOpen(false)}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button 
                  className="kalki-mobile-only kalki-hamburger-btn"
                  onClick={() => setIsMobileMenuOpen(true)}
                  style={{ background: 'none', border: 'none', color: 'white', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <Menu size={24} />
                </button>
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
                <span className="kalki-hide-on-mobile" style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 1)' }}>
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
              {(() => {
                if (session.scopes.length === 0) {
                  return <StatusMessage tone="empty">No authorized organization location is available for this account.</StatusMessage>;
                }
                
                // Route protection
                if (!session.isOwner && selected) {
                  const pathMap: Record<string, string> = {
                    "/reports": "command-center",
                    "/people": "employee",
                    "/attendance": "attendance",
                    "/payroll": "payroll",
                    "/purchasing": "purchasing",
                    "/inventory": "inventory",
                    "/sales": "sales",
                    "/crm": "crm",
                    "/finance": "finance",
                    "/settings": "settings"
                  };
                  
                  const rootPath = Object.keys(pathMap).find(p => pathname === p || pathname.startsWith(`${p}/`));
                  
                  if (rootPath) {
                    const moduleName = pathMap[rootPath];
                    const hasAccess = selected.permissions.some(p => p.startsWith(`${moduleName}.`) || p.startsWith(`${moduleName}:`));
                    
                    if (!hasAccess) {
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--danger)' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
                          <h2>Access Denied</h2>
                          <p className="muted">You do not have permission to access the {moduleName} module.</p>
                        </div>
                      );
                    }
                  }
                }
                
                return children;
              })()}
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
