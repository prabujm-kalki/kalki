import Link from "next/link";

export default function Home() {
  return (
    <main className="app-main">
      <section className="panel">
        <p className="muted">Kalki BOS</p>
        <h1 className="page-title">Operational work</h1>
        <p>Sign in with an authorized account to view assigned and generated work for a location.</p>
        <p><Link href="/login">Sign in</Link>{" | "}<Link href="/work">Open work queue</Link></p>
      </section>
    </main>
  );
}
