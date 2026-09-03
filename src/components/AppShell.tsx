"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiGet } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { StatusMessage } from "@/components/StatusMessage";
import type { SessionContext, SessionScope } from "@/components/work/types";

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

export function AppShell({ children }: { children: ReactNode }) {
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
    router.push(`/work?${next.toString()}`);
  }

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  if (error) return <main className="app-main"><StatusMessage tone="error">{error}</StatusMessage></main>;
  if (!session) return <main className="app-main"><StatusMessage tone="loading">Loading session…</StatusMessage></main>;

  return (
    <SessionViewContext.Provider value={{ session, selected }}>
      <div className="app-shell">
        <header className="app-header">
          <div>
            <p className="muted">Kalki BOS</p>
            <h1>Work operations</h1>
            <p>{session.user.email ?? session.user.name ?? session.user.id}</p>
          </div>
          <div className="toolbar">
            <label>
              <span className="muted">Organization / location</span>
              <select
                className="scope-select"
                value={selected ? scopeKey(selected) : ""}
                onChange={(event) => changeScope(event.target.value)}
              >
                <option value="" disabled>Select a location scope</option>
                {session.scopes.map((scope) => (
                  <option key={scopeKey(scope)} value={scopeKey(scope)}>
                    {scope.organizationName} / {scope.locationName}
                  </option>
                ))}
              </select>
            </label>
            <Link href={selected ? `/work?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : "/work"}>Work queue</Link>
            {session.isOwner && selected ? (
              <Link href={`/audit?organizationId=${selected.organizationId}&locationId=${selected.locationId}`}>Audit</Link>
            ) : null}
            <button type="button" className="secondary-button" onClick={() => void signOut()}>Sign out</button>
          </div>
        </header>
        <main className="app-main">
          {session.scopes.length === 0 ? (
            <StatusMessage tone="empty">No authorized organization location is available for this account.</StatusMessage>
          ) : children}
        </main>
      </div>
    </SessionViewContext.Provider>
  );
}
