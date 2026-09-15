import Link from "next/link";

export default function Home() {
  return (
    <main className="app-main">
      <section className="panel">
        <p className="muted">Kalki BOS</p>
        <h1 className="page-title">Command Center</h1>
        <p>Sign in with an authorized account to access the business operating system.</p>
        <p><Link href="/login">Sign in</Link>{" | "}<Link href="/people">Enter application</Link></p>
      </section>
    </main>
  );
}
