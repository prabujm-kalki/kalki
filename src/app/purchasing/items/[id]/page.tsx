'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSessionView } from '@/components/AppShell';
import { apiGet, apiPut } from '@/lib/api';
import { KalkiInput } from "@/components/ui/KalkiInput";
import { KalkiSelect } from "@/components/ui/KalkiSelect";
import { KalkiButton } from "@/components/ui/KalkiButton";
import { KalkiSection } from "@/components/ui/KalkiSection";
import { KalkiPageHeader } from "@/components/ui/KalkiPageHeader";
import { KalkiActionBar } from "@/components/ui/KalkiActionBar";

export default function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const itemId = resolvedParams.id;
  const [formData, setFormData] = useState({
    nameEn: '',
    nameTa: '',
    nameHi: '',
    isActive: true,
    isTrackable: true,
    currentPrice: '',
    maxPrice: '',
    unit: 'Kg',
    baseMinStock: '',
    targetStock: '',
    purchaseUnit: '',
    purchaseUnitConversion: '',
    // Hidden fields with defaults for API requirements
    orderFrequency: { daily: true, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false },
    customIntervalDays: '',
    fridaySurge: 25,
    saturdaySurge: 30,
    linkedVendors: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { selected } = useSessionView();
  
  const [vendorList, setVendorList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!selected) return;
    const query = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
    });
    
    // Fetch Vendors
    apiGet<{ items: { id: string; name: string }[] }>(`/api/vendors?${query.toString()}`)
      .then(payload => setVendorList(payload.items))
      .catch(console.error);
      
    // Fetch Item Data
    apiGet<{ item: any, vendorIds: string[] }>(`/api/items/${itemId}?${query.toString()}`)
      .then(payload => {
        setFormData({
          nameEn: payload.item.nameEn || '',
          nameTa: payload.item.nameTa || '',
          nameHi: payload.item.nameHi || '',
          isActive: payload.item.isActive,
          isTrackable: payload.item.isTrackable,
          currentPrice: payload.item.currentPrice || '',
          maxPrice: payload.item.maxPrice || '',
          unit: payload.item.unit || 'Kg',
          baseMinStock: payload.item.baseMinStock || '',
          targetStock: payload.item.targetStock || '',
          purchaseUnit: payload.item.purchaseUnit || '',
          purchaseUnitConversion: payload.item.purchaseUnitConversion?.toString() || '',
          orderFrequency: payload.item.orderFrequency || { daily: true, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false },
          customIntervalDays: payload.item.orderFrequency?.customIntervalDays?.toString() || '',
          fridaySurge: payload.item.fridaySurge || 25,
          saturdaySurge: payload.item.saturdaySurge || 30,
          linkedVendors: payload.vendorIds || [],
        });
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || "Failed to load item data.");
        setLoading(false);
      });
  }, [selected, itemId]);

  const handleSave = async () => {
    setError(null);
    if (!selected?.organizationId || !selected?.locationId) {
      setError("Please select an organization and location from the top navigation before saving.");
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          organizationId: selected?.organizationId,
          locationId: selected?.locationId,
          currentPrice: Number(formData.currentPrice),
          maxPrice: Number(formData.maxPrice),
          baseMinStock: Number(formData.baseMinStock),
          targetStock: formData.targetStock ? Number(formData.targetStock) : undefined,
          purchaseUnit: formData.purchaseUnit || undefined,
          purchaseUnitConversion: formData.purchaseUnitConversion ? Number(formData.purchaseUnitConversion) : undefined,
          orderFrequency: {
            ...formData.orderFrequency,
            customIntervalDays: formData.customIntervalDays ? Number(formData.customIntervalDays) : undefined
          },
          fridaySurge: Number(formData.fridaySurge),
          saturdaySurge: Number(formData.saturdaySurge),
          vendorIds: formData.linkedVendors.length > 0 ? formData.linkedVendors : ['00000000-0000-0000-0000-000000000000'],
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        if (Array.isArray(data.error)) {
          const messages = data.error.map((e: any) => {
            const field = e.path && e.path.length > 0 ? e.path[e.path.length - 1] : '';
            return field ? `${field}: ${e.message}` : e.message;
          });
          throw new Error(messages.join(' | '));
        }
        throw new Error(data.error || 'Failed to save');
      }
      const nextQuery = new URLSearchParams({
        organizationId: selected?.organizationId || '',
        locationId: selected?.locationId || '',
      });
      router.push(`/purchasing/items?${nextQuery.toString()}`);
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  const StatusActions = (
    <div className="row" style={{ gap: '1rem', alignItems: 'center' }}>
      <label className="row" style={{ cursor: 'pointer', gap: '0.25rem' }}>
        <input 
          type="radio" 
          checked={formData.isActive} 
          onChange={() => setFormData(p => ({ ...p, isActive: true }))} 
        /> Active
      </label>
      <label className="row" style={{ cursor: 'pointer', gap: '0.25rem' }}>
        <input 
          type="radio" 
          checked={!formData.isActive} 
          onChange={() => setFormData(p => ({ ...p, isActive: false }))} 
        /> Inactive
      </label>
    </div>
  );

  if (loading) {
    return <div className="app-main"><div className="status-message">Loading...</div></div>;
  }

  return (
    <div className="app-main">
      <KalkiPageHeader 
        title="EDIT ITEM"
        breadcrumbs={<Link href={`/purchasing/items${selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : ''}`} className="nav-link">&larr; Back to Items</Link>}
        actions={StatusActions}
      />
      
      {error && <div className="status-message error" style={{ color: 'red', marginBottom: '1rem', padding: '1rem', background: '#fee2e2', borderRadius: '4px' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '6rem' }}>
        <KalkiSection title="1. ITEM DETAILS & TRANSLATION" icon="📌">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <KalkiInput 
              label="Item Name (English)" 
              required
              value={formData.nameEn} 
              onChange={e => setFormData(p => ({ ...p, nameEn: e.target.value }))}
              placeholder="Enter item name..."
            />
            <KalkiInput 
              label="Item Name (Tamil)" 
              required
              value={formData.nameTa} 
              onChange={e => setFormData(p => ({ ...p, nameTa: e.target.value }))}
            />
            <KalkiInput 
              label="Item Name (Hindi)" 
              required
              value={formData.nameHi} 
              onChange={e => setFormData(p => ({ ...p, nameHi: e.target.value }))}
            />
          </div>
          <div className="kalki-field" style={{ marginTop: '1rem' }}>
            <label className="row" style={{ cursor: 'pointer', gap: '0.5rem', fontWeight: 600 }}>
              <input 
                type="checkbox" 
                checked={formData.isTrackable} 
                onChange={(e) => setFormData(p => ({ ...p, isTrackable: e.target.checked }))} 
                style={{ width: '1.2rem', height: '1.2rem' }}
              />
              Trackable Inventory Item
            </label>
            <p className="kalki-error-text" style={{ color: 'var(--kalki-foreground-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Uncheck for items (like Salt, Tamarind) that are ordered and received, but their daily POS consumption is NOT strictly tracked.
            </p>
          </div>
        </KalkiSection>

        <KalkiSection title="2. PRICING & MEASUREMENT" icon="💰">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <KalkiInput 
              label="Current Price" 
              required
              type="number"
              placeholder="₹"
              value={formData.currentPrice} 
              onChange={e => setFormData(p => ({ ...p, currentPrice: e.target.value }))} 
            />
            <KalkiInput 
              label="Max Price" 
              required
              type="number"
              placeholder="₹"
              value={formData.maxPrice} 
              onChange={e => setFormData(p => ({ ...p, maxPrice: e.target.value }))} 
            />
            <KalkiSelect
              label="Unit of Measure"
              required
              value={formData.unit} 
              onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))}
            >
              <option value="Kg">Kg</option>
              <option value="Liter">Liter</option>
              <option value="Gram">Gram</option>
              <option value="Piece">Piece</option>
              <option value="Box">Box</option>
              <option value="Packet">Packet</option>
            </KalkiSelect>
          </div>
        </KalkiSection>

        <KalkiSection title="3. VENDOR MAPPING" icon="🤝">
          <KalkiSelect 
            label="Linked Vendors"
            required
            onChange={e => {
              const val = e.target.value;
              if (val && !formData.linkedVendors.includes(val as never)) {
                setFormData(p => ({ ...p, linkedVendors: [...p.linkedVendors, val] as never[] }));
              }
              e.target.value = "";
            }}
          >
            <option value="">Search and select vendors...</option>
            {vendorList.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </KalkiSelect>
          
          <div className="row" style={{ marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            {formData.linkedVendors.map(vendorId => {
              const vendorName = vendorList.find(v => v.id === vendorId)?.name || 'Unknown Vendor';
              return (
                <span key={vendorId} className="pill" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--kalki-primary-light)', color: 'var(--kalki-primary)', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 500 }}>
                  {vendorName} 
                  <X size={14} style={{cursor:'pointer'}} onClick={() => setFormData(p => ({ ...p, linkedVendors: p.linkedVendors.filter(id => id !== vendorId) }))} />
                </span>
              );
            })}
          </div>
        </KalkiSection>

        <KalkiSection title="4. INVENTORY RULES & RECURRENCE" icon="📅">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
            <KalkiInput 
              label={`Base Minimum Stock (${formData.unit})`}
              required
              type="number" 
              value={formData.baseMinStock} 
              onChange={e => setFormData(p => ({ ...p, baseMinStock: e.target.value }))} 
            />
            <KalkiInput 
              label={`Reorder Quantity in ${formData.unit}`}
              type="number" 
              value={formData.targetStock} 
              onChange={e => setFormData(p => ({ ...p, targetStock: e.target.value }))} 
            />
            <KalkiSelect
              label="Purchase Unit (Optional)"
              value={formData.purchaseUnit}
              onChange={e => setFormData(p => ({ ...p, purchaseUnit: e.target.value }))}
            >
              <option value="">Same as Base Unit</option>
              <option value="Bag">Bag</option>
              <option value="Box">Box</option>
              <option value="Carton">Carton</option>
              <option value="Sack">Sack</option>
              <option value="Kg">Kg</option>
              <option value="Liter">Liter</option>
              <option value="Piece">Piece</option>
            </KalkiSelect>
            <KalkiInput 
              label={`Qty per ${formData.purchaseUnit || 'Unit'} (in ${formData.unit})`}
              type="number" 
              placeholder={`e.g. 50`}
              value={formData.purchaseUnitConversion} 
              onChange={e => setFormData(p => ({ ...p, purchaseUnitConversion: e.target.value }))} 
            />
          </div>
        </KalkiSection>

        <KalkiSection title="5. DEMAND SURGE MULTIPLIERS (Overrides)" icon="📈">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="kalki-field">
              <label className="row" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="checkbox" defaultChecked />
                Friday Night Order Surge (%)
              </label>
              <input className="kalki-input" type="number" value={formData.fridaySurge} onChange={e => setFormData(p => ({ ...p, fridaySurge: Number(e.target.value) }))} />
            </div>
            <div className="kalki-field">
              <label className="row" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="checkbox" defaultChecked />
                Saturday Night Order Surge (%)
              </label>
              <input className="kalki-input" type="number" value={formData.saturdaySurge} onChange={e => setFormData(p => ({ ...p, saturdaySurge: Number(e.target.value) }))} />
            </div>
          </div>
        </KalkiSection>
      </div>
      
      <KalkiActionBar>
        <KalkiButton 
          variant="secondary" 
          onClick={() => router.push(`/purchasing/items${selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : ''}`)}
        >
          Cancel
        </KalkiButton>
        <KalkiButton 
          variant="primary" 
          onClick={handleSave}
          isLoading={saving}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Save size={18} /> Update Item
        </KalkiButton>
      </KalkiActionBar>
    </div>
  );
}
