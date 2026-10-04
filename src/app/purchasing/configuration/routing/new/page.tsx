import Link from "next/link";
import { GitMerge, ArrowLeft, Settings2 } from "lucide-react";

export default function NewRoutingRulePage() {
  return (
    <div className="stack">
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/purchasing/configuration" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--text-muted)' }}>
          <ArrowLeft size={16} /> Back to Configuration
        </Link>
      </div>
      <section className="panel">
        <div className="panel-header">
          <h2>Create Routing Rule</h2>
          <p className="muted">Define condition-based rules for purchase order approvals.</p>
        </div>
        <div style={{ padding: "4rem 2rem", textAlign: 'center' }}>
          <div style={{ backgroundColor: '#f1f5f9', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
            <GitMerge size={32} style={{ color: 'var(--kalki-primary)' }} />
          </div>
          <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0' }}>Advanced Routing Engine</h3>
          <p className="muted" style={{ maxWidth: '400px', margin: '0 auto 2rem auto', lineHeight: '1.6' }}>
            The rule engine is currently being finalized to ensure full flexibility for amount-based routing, department mapping, and multi-tier approvals.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#e2e8f0', color: 'var(--text-secondary)', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500' }}>
            <Settings2 size={16} /> Configuration Module - Work in Progress
          </div>
        </div>
      </section>
    </div>
  );
}
