"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, Suspense, type ReactNode } from "react";
import { apiGet } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { APP_MODULES } from "@/lib/modules";
import { StatusMessage } from "@/components/StatusMessage";
import type { SessionContext, SessionScope } from "@/components/work/types";
import { ToastProvider } from "./ui/Toast";
import { Menu, X, User as UserIcon, LogOut, Settings as SettingsIcon, ChevronDown } from "lucide-react";
import { NotificationPoller } from "./NotificationPoller";

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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  
  const organizationId = searchParams.get("organizationId");
  const locationId = searchParams.get("locationId");

  useEffect(() => {
    let cancelled = false;
    apiGet<{ session: SessionContext }>(`/api/session-context?t=${Date.now()}`).then((payload) => {
      if (!cancelled) setSession(payload.session);
    }).catch((caught) => {
      if (cancelled) return;
      if ("status" in caught && caught.status === 401) {
        authClient.signOut().finally(() => {
          window.location.href = `/login?next=${encodeURIComponent(`${pathname}?${searchParams.toString()}`)}`;
        });
        return;
      }
      setError(caught instanceof Error ? caught.message : "Unable to load session");
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, router, searchParams]);

  // Initialize Native Push Notifications & Capgo OTA Updater when on native device
  useEffect(() => {
    import("@/lib/mobileNative").then(({ initializeNativeMobile }) => {
      initializeNativeMobile();
    });
  }, []);

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
    if (!value) {
      // User selected "Select Location..." (reset scope)
      const next = new URLSearchParams(searchParams.toString());
      next.delete("organizationId");
      next.delete("locationId");
      const qs = next.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
      return;
    }
    const [nextOrganizationId, nextLocationId] = value.split(":");
    const next = new URLSearchParams(searchParams.toString());
    next.set("organizationId", nextOrganizationId);
    next.set("locationId", nextLocationId);
    const nextPath = pathname.startsWith("/work/") ? "/work" : pathname;
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
        {selected && <NotificationPoller organizationId={selected.organizationId} />}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#d4af37" stroke="none">
                  <path d="M12 2C12 2 15 7 15 11C15 13 14 15 12 16C10 15 9 13 9 11C9 7 12 2 12 2ZM22 13C22 13 18 10 15 11.5C14 12 13 13.5 13 15C13 18 16 22 16 22C16 22 20 18 22 13ZM2 13C2 13 6 10 9 11.5C10 12 11 13.5 11 15C11 18 8 22 8 22C8 22 4 18 2 13Z" />
                </svg>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                  <span style={{ fontSize: '1.25rem' }}>Kalki BOS</span>
                  <span style={{ fontSize: '0.55rem', letterSpacing: '0.05em', color: '#b7ae9f', marginTop: '4px', textTransform: 'uppercase', fontWeight: 500 }}>Business Operating System</span>
                </div>
              </div>
              <button 
                className="kalki-mobile-only" 
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ background: 'none', border: 'none', color: '#d4af37' }}
              >
                <X size={20} />
              </button>
            </div>
            
            {selected && (
              <nav className="kalki-sidebar-nav">
                <div style={{ padding: '0 1.25rem 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
                  Modules
                </div>
                {APP_MODULES
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
                  style={{ width: 'auto', maxWidth: '250px', textOverflow: 'ellipsis', padding: '0.25rem 2rem 0.25rem 0.75rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                  value={selected ? scopeKey(selected) : ""}
                  onChange={(event) => changeScope(event.target.value)}
                >
                  <option value="">Select Location...</option>
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
                {/* User Profile Avatar (Google-style round badge) */}
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '2px solid rgba(212, 175, 55, 0.8)',
                    padding: 0,
                    margin: 0,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#7c3a27',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    flexShrink: 0,
                  }}
                  title={session.user.name || session.user.email || "Account"}
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        // Fallback to initial on image broken
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span>{(session.user.name || session.user.email || "U").charAt(0).toUpperCase()}</span>
                  )}
                </button>

                {/* Profile Popover / Dropdown Menu */}
                {isProfileMenuOpen && (
                  <>
                    <div
                      style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 998,
                      }}
                      onClick={() => setIsProfileMenuOpen(false)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '42px',
                        right: 0,
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        width: '260px',
                        padding: '1rem',
                        zIndex: 999,
                        color: '#0f172a',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                      }}
                    >
                      {/* User Info Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            backgroundColor: '#7c3a27',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '18px',
                            overflow: 'hidden',
                            flexShrink: 0,
                          }}
                        >
                          {session.user.image ? (
                            <img
                              src={session.user.image}
                              alt="Avatar"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            (session.user.name || session.user.email || "U").charAt(0).toUpperCase()
                          )}
                        </div>
                        <div style={{ overflow: 'hidden', minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {session.user.name || "Kalki User"}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {session.user.email}
                          </div>
                          {session.isOwner && (
                            <span style={{ display: 'inline-block', fontSize: '0.65rem', fontWeight: 700, backgroundColor: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: '4px', marginTop: '2px' }}>
                              System Owner
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Menu Options */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <Link
                          href={selected ? `/me/settings?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : "/me/settings"}
                          onClick={() => setIsProfileMenuOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 0.65rem',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            color: '#334155',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <SettingsIcon size={16} color="#64748b" />
                          <span>Account Settings</span>
                        </Link>
                      </div>

                      {/* Sign Out Action */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          void signOut();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 0.65rem',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          width: '100%',
                          textAlign: 'left',
                          marginTop: '0.25rem',
                        }}
                      >
                        <LogOut size={16} />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </>
                )}
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
