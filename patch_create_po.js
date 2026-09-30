const fs = require('fs');

let c = fs.readFileSync('src/app/purchasing/purchase-orders/create/page.tsx', 'utf8');

c = c.replace(
  'const [error, setError] = useState<string | null>(null);',
  `const [error, setError] = useState<string | null>(null);
  const [recentPOs, setRecentPOs] = useState<any[]>([]);

  const fetchRecentPOs = () => {
    if (!selected) return;
    const query = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
      limit: "5"
    });
    apiGet<{ purchaseOrders: any[] }>(\`/api/purchase-orders?\${query.toString()}\`).then(res => {
      setRecentPOs(res.purchaseOrders);
    }).catch(console.error);
  };

  useEffect(() => {
    fetchRecentPOs();
  }, [selected]);`
);

c = c.replace(
  'alert("Purchase Order created successfully!");\n      router.push(`/purchasing${query ? "?"+query : ""}`);',
  `alert("Purchase Order created successfully!");
      setVendorItems([]);
      setSelectedVendorId("");
      fetchRecentPOs();`
);

c = c.replace(
  '      </form>\n    </div>\n  );\n}\n',
  `      </form>

      <div style={{ marginTop: '3rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem' }}>Recent History (Verification)</h3>
        {recentPOs.length > 0 ? (
          <table className="kalki-table">
            <thead>
              <tr>
                <th>PO ID</th>
                <th>Vendor</th>
                <th>Date</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentPOs.map(po => (
                <tr key={po.id} style={{ opacity: 0.8 }}>
                  <td>{po.id.split('-')[0].toUpperCase() + '-' + po.id.substring(1, 5)}</td>
                  <td>{po.vendorName}</td>
                  <td>{new Date(po.createdAt).toLocaleDateString()}</td>
                  <td>{po.status}</td>
                  <td>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(po.totalAmount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>No recent purchase orders found.</p>
        )}
      </div>
    </div>
  );
}
`
);

fs.writeFileSync('src/app/purchasing/purchase-orders/create/page.tsx', c);
console.log('Patched page.tsx');
