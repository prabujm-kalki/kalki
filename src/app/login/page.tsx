"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { StatusMessage } from "@/components/StatusMessage";
import { authClient } from "@/lib/auth-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const email = `${phone}@kalki.internal`;
    const result = await authClient.signIn.email({ email, password });
    setPending(false);
    if (result.error) {
      setError(result.error.message ?? "Sign-in failed");
      return;
    }
    router.replace(searchParams.get("next") || "/work");
  }

  return (
    <section className="panel auth-card">
      <h1 className="page-title">Sign in to Kalki BOS</h1>
      <p className="muted">Work operations uses your authorized organization and location memberships.</p>
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
      <form onSubmit={(event) => void submit(event)}>
        <label>
          Mobile Number
          <input type="tel" autoComplete="username" value={phone} onChange={(event) => setPhone(event.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <button type="submit" className="action-button" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      </form>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="app-main"><StatusMessage tone="loading">Loading…</StatusMessage></main>}>
      <LoginForm />
    </Suspense>
  );
}
