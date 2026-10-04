"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Tag, ChevronRight, Edit2, CheckCircle2 } from 'lucide-react';
import { useSessionView } from '@/components/AppShell';

export function ItemClassificationManager() {
  const { selected } = useSessionView();
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<Record<string, any[]>>({});
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  const [newCatName, setNewCatName] = useState('');
  const [newSubcatName, setNewSubcatName] = useState('');
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selected) {
      loadCategories();
    }
  }, [selected]);

  const loadCategories = async () => {
    if (!selected) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/item-categories?organizationId=${selected.organizationId}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        if (data.length > 0 && !selectedCategoryId) {
          setSelectedCategoryId(data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCategoryId) {
      loadSubcategories(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  const loadSubcategories = async (categoryId: string) => {
    try {
      const res = await fetch(`/api/item-subcategories?categoryId=${categoryId}`);
      if (res.ok) {
        const data = await res.json();
        setSubcategories(prev => ({ ...prev, [categoryId]: data }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim() || !selected) return;
    try {
      const res = await fetch('/api/item-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim(), organizationId: selected.organizationId })
      });
      if (res.ok) {
        setNewCatName('');
        await loadCategories();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to create category: ${errData.error || res.statusText}`);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Error: ${e.message}`);
    }
  };

  const handleCreateSubcategory = async () => {
    if (!newSubcatName.trim() || !selectedCategoryId) return;
    try {
      const res = await fetch('/api/item-subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSubcatName.trim(), categoryId: selectedCategoryId })
      });
      if (res.ok) {
        setNewSubcatName('');
        await loadSubcategories(selectedCategoryId);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to create subcategory: ${errData.error || res.statusText}`);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Error: ${e.message}`);
    }
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.25rem 0' }}>Item Classification</h3>
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            Manage your Chart of Accounts: Main Categories and Subcategories for meaningful expense tracking.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Main Categories Panel */}
        <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'white', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Main Categories</h4>
          </div>
          
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="e.g. Food Cost" 
                style={{ flex: 1, padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
              />
              <button 
                onClick={handleCreateCategory}
                style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <Plus size={16} /> Add
              </button>
            </div>
          </div>
          
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '300px', overflowY: 'auto' }}>
            {categories.map(cat => (
              <li 
                key={cat.id} 
                onClick={() => setSelectedCategoryId(cat.id)}
                style={{ 
                  padding: '0.75rem 1rem', 
                  borderBottom: '1px solid #f1f5f9', 
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: selectedCategoryId === cat.id ? '#eff6ff' : 'transparent',
                  borderLeft: selectedCategoryId === cat.id ? '3px solid #3b82f6' : '3px solid transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Tag size={16} style={{ color: selectedCategoryId === cat.id ? '#3b82f6' : '#94a3b8' }} />
                  <span style={{ fontWeight: selectedCategoryId === cat.id ? 600 : 400, color: selectedCategoryId === cat.id ? '#1e40af' : 'inherit' }}>{cat.name}</span>
                </div>
                <ChevronRight size={16} style={{ color: '#cbd5e1' }} />
              </li>
            ))}
            {categories.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                No categories defined.
              </div>
            )}
          </ul>
        </div>

        {/* Subcategories Panel */}
        <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'white', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>
              {selectedCategoryId 
                ? `Subcategories under ${categories.find(c => c.id === selectedCategoryId)?.name}`
                : 'Subcategories'
              }
            </h4>
          </div>
          
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                value={newSubcatName}
                onChange={e => setNewSubcatName(e.target.value)}
                placeholder="e.g. Vegetables" 
                disabled={!selectedCategoryId}
                style={{ flex: 1, padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: !selectedCategoryId ? '#f8fafc' : 'white' }}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSubcategory()}
              />
              <button 
                onClick={handleCreateSubcategory}
                disabled={!selectedCategoryId}
                style={{ padding: '0.5rem 1rem', backgroundColor: selectedCategoryId ? '#3b82f6' : '#94a3b8', color: 'white', border: 'none', borderRadius: '4px', cursor: selectedCategoryId ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <Plus size={16} /> Add
              </button>
            </div>
          </div>
          
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '300px', overflowY: 'auto' }}>
            {selectedCategoryId && subcategories[selectedCategoryId]?.map(subcat => (
              <li 
                key={subcat.id} 
                style={{ 
                  padding: '0.75rem 1rem', 
                  borderBottom: '1px solid #f1f5f9', 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                <span>{subcat.name}</span>
              </li>
            ))}
            {(!selectedCategoryId || !subcategories[selectedCategoryId] || subcategories[selectedCategoryId].length === 0) && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                {!selectedCategoryId ? 'Select a category to view subcategories.' : 'No subcategories defined for this category.'}
              </div>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
