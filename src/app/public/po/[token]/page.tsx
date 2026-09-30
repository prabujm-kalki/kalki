"use client";

import { useEffect, useState, use } from 'react';
import { notFound } from 'next/navigation';

export default function PublicPurchaseOrderPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;
  const [po, setPo] = useState<any>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/public/po?token=${token}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        setPo(data.po);
        setLines(data.lines);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [token]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Purchase Order...</div>;
  if (error || !po) return <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>Purchase Order not found or link has expired.</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #ccc', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px' }}>{po.orgName}</h1>
          <p style={{ margin: '4px 0', color: '#666' }}>Purchase Order</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>PO #: {po.id.split('-')[0].toUpperCase() + '-' + po.id.substring(1, 5)}</h2>
          <p style={{ margin: '4px 0', color: '#666' }}>Date: {new Date(po.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Vendor Details:</h3>
        <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{po.vendorName}</p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #ccc' }}>
            <th style={{ textAlign: 'left', padding: '8px' }}>Item</th>
            <th style={{ textAlign: 'right', padding: '8px' }}>Quantity</th>
            
          </tr>
        </thead>
        <tbody>
          {lines.map((line, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px' }}>{line.itemName}</td>
              <td style={{ textAlign: 'right', padding: '8px' }}>{line.orderedQuantity}</td>
              
            </tr>
          ))}
        </tbody>
        
      </table>

      <div style={{ display: 'flex', justifyContent: 'center' }} className="no-print">
        <button 
          onClick={() => {
            if (typeof window !== 'undefined') window.print();
          }}
          style={{ padding: '10px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
        >
          Download PDF / Print
        </button>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}} />
    </div>
  );
}
