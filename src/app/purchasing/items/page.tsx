"use client";

import Link from "next/link";
import { Plus, Edit } from "lucide-react";
import { useSessionView } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

type ItemView = {
  id: string;
  nameEn: string;
  unit: string;
  currentPrice: string;
  isActive: boolean;
};

export default function ItemsPage() {
  const { selected } = useSessionView();
  const query = selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : '';
  const [itemsList, setItemsList] = useState<ItemView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selected) {
      setLoading(false);
      return;
    }
    const params = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
    });
    apiGet<{ items: ItemView[] }>(`/api/items?${params.toString()}`)
      .then(res => {
        setItemsList(res.items);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selected]);

  return (
    <div className="stack">
      <section className="panel">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h1 className="page-title">Items</h1>
            <p className="muted">Manage products, pricing, and link them to your suppliers.</p>
          </div>
          <div>
            <Link href={`/purchasing/items/create${query}`} className="action-button" style={{ textDecoration: 'none' }}>
              <Plus size={18} /> Add New Item
            </Link>
          </div>
        </div>
      </section>

      <section className="panel">
        {loading ? (
          <div className="status-message">Loading items...</div>
        ) : itemsList.length === 0 ? (
          <div className="status-message empty">
            <p>You haven't added any items yet.</p>
            <Link href={`/purchasing/items/create${query}`} className="secondary-button" style={{ marginTop: '1rem', textDecoration: 'none' }}>Create your first item</Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--kalki-primary-light)', color: 'var(--kalki-primary)' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600 }}>Item Name</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600 }}>Unit</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600 }}>Current Price</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 1rem', fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {itemsList.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '0.75rem 1rem' }}><strong>{item.nameEn}</strong></td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{item.unit}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>₹{item.currentPrice}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className="pill" style={{ background: item.isActive ? 'var(--success-light)' : 'var(--border-color)', color: item.isActive ? 'var(--success)' : 'var(--text-muted)', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '0.75rem 1rem' }}>
                      <Link href={`/purchasing/items/${item.id}${query}`} className="secondary-button" title="Edit Item" style={{ padding: '0.4rem 0.6rem', display: 'inline-flex', borderRadius: '0.375rem', border: '1px solid var(--border-color)', background: 'white', color: 'var(--kalki-primary)' }}>
                        <Edit size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
