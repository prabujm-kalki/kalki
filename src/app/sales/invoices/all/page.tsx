"use client";

import React, { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { useSessionView } from "@/components/AppShell";
import { fetchInvoices, fetchInvoiceDetails } from "@/app/sales/actions";
import { X, Printer, FileText, Search, Eye, Filter, Download } from "lucide-react";
import { useSearchParams } from 'next/navigation';

function InvoicesContent() {
  const searchParams = useSearchParams();
  const { session, selected: scope } = useSessionView();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Filter States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    customer: "",
    minAmount: "",
    maxAmount: "",
    status: "",
    paymentStatus: searchParams.get('paymentStatus') || ""
  });

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const paymentStatusParam = searchParams.get('paymentStatus');
    if (paymentStatusParam) {
      setFilters(prev => ({ ...prev, paymentStatus: paymentStatusParam }));
    }
  }, [searchParams]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    
    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterOpen]);

  const handleViewDetails = async (id: string) => {
    setModalLoading(true);
    setSelectedInvoice({ id, loading: true });
    try {
      const data = await fetchInvoiceDetails(id);
      setSelectedInvoice(data);
    } catch (err) {
      console.error(err);
      setSelectedInvoice(null);
    } finally {
      setModalLoading(false);
    }
  };
  
  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    if (scope?.organizationId && scope?.locationId) {
      loadInvoices();
    }
  }, [scope]);

  const loadInvoices = async () => {
    if (!scope) return;
    setLoading(true);
    try {
      const data = await fetchInvoices(scope.organizationId, scope.locationId);
      setInvoices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // Search term
      if (searchTerm && !inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) && !inv.customerName.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      // Customer
      if (filters.customer && !inv.customerName.toLowerCase().includes(filters.customer.toLowerCase())) {
        return false;
      }
      // Date Range
      if (filters.startDate && new Date(inv.date) < new Date(filters.startDate)) return false;
      if (filters.endDate && new Date(inv.date) > new Date(filters.endDate)) return false;
      // Amount Range
      if (filters.minAmount && inv.total < parseFloat(filters.minAmount)) return false;
      if (filters.maxAmount && inv.total > parseFloat(filters.maxAmount)) return false;
      // Statuses
      if (filters.status && inv.status !== filters.status) return false;
      
      if (filters.paymentStatus === 'OVERDUE') {
        // If overdue, it must be not paid AND date must be in the past
        if (inv.paymentStatus === 'PAID') return false;
        if (new Date(inv.date) >= new Date()) return false;
      } else if (filters.paymentStatus && inv.paymentStatus !== filters.paymentStatus) {
        return false;
      }

      return true;
    });
  }, [invoices, searchTerm, filters]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters, pageSize]);

  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(startIndex, startIndex + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredInvoices.length / pageSize) || 1;

  const resetFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      customer: "",
      minAmount: "",
      maxAmount: "",
      status: "",
      paymentStatus: ""
    });
  };
  const handleMarkAsPending = async () => {
    if (!selectedInvoice) return;
    if (!confirm("Are you sure you want to change this invoice status back to PENDING (Credit)? This will reverse the generated Cash Journal Entry in the Finance module and post it to Accounts Receivable.")) {
      return;
    }
    
    // Optimistic update
    const updatedInvoice = { ...selectedInvoice, paymentStatus: 'PENDING', paymentMode: 'CREDIT' };
    setSelectedInvoice(updatedInvoice);
    
    // Update main list
    setInvoices(invoices.map(inv => 
      inv.id === selectedInvoice.id ? { ...inv, paymentStatus: 'PENDING' } : inv
    ));

    try {
      const { updateInvoicePaymentStatus } = await import("@/app/sales/actions");
      await updateInvoicePaymentStatus(selectedInvoice.id, 'PENDING', 'CREDIT');
      alert("Success! Status changed to PENDING. A Reversal Journal Entry has been posted to Finance.");
    } catch (e) {
      console.error(e);
      alert("Failed to update status. Reverting change.");
      // Revert optimistic update
      setSelectedInvoice(selectedInvoice);
    }
  };


  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1e293b', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={24} color="#3b82f6" /> All Invoices
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>View and manage all your generated sales invoices.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search invoices..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '250px' }}
            />
          </div>
          <div ref={filterRef} style={{ position: 'relative' }}>
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: isFilterOpen || Object.values(filters).some(x => x !== "") ? '#eff6ff' : 'white', border: isFilterOpen || Object.values(filters).some(x => x !== "") ? '1px solid #bfdbfe' : '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', fontWeight: '500', color: isFilterOpen || Object.values(filters).some(x => x !== "") ? '#2563eb' : '#475569', cursor: 'pointer' }}
            >
              <Filter size={16} /> Filter
            </button>

            {isFilterOpen && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'white', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', border: '1px solid #e2e8f0', width: '380px', zIndex: 100 }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>Filter Invoices</h3>
                  <button onClick={resetFilters} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Clear All</button>
                </div>
                
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>From Date</label>
                      <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>To Date</label>
                      <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Customer Name</label>
                    <input type="text" placeholder="Filter by customer..." value={filters.customer} onChange={e => setFilters({...filters, customer: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Min Amount (₹)</label>
                      <input type="number" placeholder="0.00" value={filters.minAmount} onChange={e => setFilters({...filters, minAmount: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Max Amount (₹)</label>
                      <input type="number" placeholder="Any" value={filters.maxAmount} onChange={e => setFilters({...filters, maxAmount: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Issue Status</label>
                      <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}>
                        <option value="">All Statuses</option>
                        <option value="ISSUED">ISSUED</option>
                        <option value="DRAFT">DRAFT</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Payment Status</label>
                      <select value={filters.paymentStatus} onChange={e => setFilters({...filters, paymentStatus: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}>
                        <option value="">All Payments</option>
                        <option value="PENDING">PENDING</option>
                        <option value="PAID">PAID</option>
                        <option value="OVERDUE">OVERDUE</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button onClick={() => setIsFilterOpen(false)} style={{ background: 'white', color: '#64748b', border: '1px solid #cbd5e1', padding: '8px 20px', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}>Cancel</button>
                  <button onClick={() => setIsFilterOpen(false)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>Apply Filters</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '16px', fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Invoice Date</th>
              <th style={{ padding: '16px', fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Invoice No.</th>
              <th style={{ padding: '16px', fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer</th>
              <th style={{ padding: '16px', fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Amount</th>
              <th style={{ padding: '16px', fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
              <th style={{ padding: '16px', fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment</th>
              <th style={{ padding: '16px', fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  Loading invoices...
                </td>
              </tr>
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '60px 40px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <Filter size={48} color="#cbd5e1" />
                    <span style={{ fontSize: '16px', fontWeight: '500' }}>No matching invoices found</span>
                    <span style={{ fontSize: '14px' }}>Try adjusting your search or filter criteria.</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedInvoices.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#475569', fontWeight: '500' }}>{inv.date}</td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#0f172a', fontWeight: '600' }}>{inv.invoiceNumber}</td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#334155' }}>{inv.customerName}</td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#0f172a', fontWeight: '600' }}>₹ {inv.total.toFixed(2)}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', background: inv.status === 'ISSUED' ? '#dbeafe' : '#f1f5f9', color: inv.status === 'ISSUED' ? '#1d4ed8' : '#475569' }}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', background: inv.paymentStatus === 'PAID' ? '#dcfce3' : inv.paymentStatus === 'PENDING' ? '#fef3c7' : '#f1f5f9', color: inv.paymentStatus === 'PAID' ? '#166534' : inv.paymentStatus === 'PENDING' ? '#b45309' : '#475569' }}>
                      {inv.paymentStatus}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button onClick={() => handleViewDetails(inv.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#3b82f6'; }} onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }} title="View Details">
                        <Eye size={18} />
                      </button>
                      <button onClick={() => handleViewDetails(inv.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#3b82f6'; }} onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }} title="Download PDF">
                        <Download size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* Pagination Controls */}
        {filteredInvoices.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'white', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', color: '#64748b' }}>Records per page:</span>
              <select 
                value={pageSize} 
                onChange={(e) => setPageSize(Number(e.target.value))}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', background: 'white', cursor: 'pointer' }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '14px', color: '#64748b' }}>
                Showing {filteredInvoices.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredInvoices.length)} of {filteredInvoices.length}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '6px 12px', background: currentPage === 1 ? '#f1f5f9' : 'white', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', color: currentPage === 1 ? '#94a3b8' : '#0f172a', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                >
                  Previous
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '6px 12px', background: currentPage === totalPages ? '#f1f5f9' : 'white', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', color: currentPage === totalPages ? '#94a3b8' : '#0f172a', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedInvoice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>
                {selectedInvoice.loading ? 'Loading Invoice...' : `Invoice #${selectedInvoice.invoiceNumber}`}
              </h2>
              <div style={{ display: 'flex', gap: '12px' }}>
                {session?.isOwner && !selectedInvoice.loading && selectedInvoice.paymentStatus === 'PAID' && (
                  <button onClick={handleMarkAsPending} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '14px', fontWeight: '500', color: '#d97706', cursor: 'pointer' }}>
                    Mark as Pending
                  </button>
                )}
                {!selectedInvoice.loading && (
                  <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', fontWeight: '500', color: '#0f172a', cursor: 'pointer' }}>
                    <Printer size={16} /> Print
                  </button>
                )}
                <button onClick={() => setSelectedInvoice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              {selectedInvoice.loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading invoice details...</div>
              ) : (
                <div id="invoice-print-area">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>Billed To</h3>
                      <p style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>{selectedInvoice.customerName}</p>
                      <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#475569' }}>GSTIN: {selectedInvoice.customerGstin}</p>
                      <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>{selectedInvoice.billingAddress}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>Invoice Details</h3>
                      <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#475569' }}>Invoice No: <span style={{ fontWeight: '500', color: '#0f172a' }}>{selectedInvoice.invoiceNumber}</span></p>
                      <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#475569' }}>Date: <span style={{ fontWeight: '500', color: '#0f172a' }}>{selectedInvoice.invoiceDate ? new Date(selectedInvoice.invoiceDate).toLocaleDateString() : ''}</span></p>
                    </div>
                  </div>
                  
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '32px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 0', textAlign: 'left', fontSize: '13px', color: '#64748b' }}>Description</th>
                        <th style={{ padding: '12px 0', textAlign: 'right', fontSize: '13px', color: '#64748b' }}>Qty</th>
                        <th style={{ padding: '12px 0', textAlign: 'right', fontSize: '13px', color: '#64748b' }}>Rate</th>
                        <th style={{ padding: '12px 0', textAlign: 'right', fontSize: '13px', color: '#64748b' }}>GST %</th>
                        <th style={{ padding: '12px 0', textAlign: 'right', fontSize: '13px', color: '#64748b' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items?.map((item: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 0', fontSize: '14px', color: '#0f172a' }}>{item.description}</td>
                          <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', color: '#475569' }}>{item.qty}</td>
                          <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', color: '#475569' }}>₹ {item.rate.toFixed(2)}</td>
                          <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', color: '#475569' }}>{item.gstRate}%</td>
                          <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>₹ {item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: '300px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '14px', color: '#475569' }}>Subtotal</span>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>₹ {parseFloat(selectedInvoice.subtotalAmount || 0).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <span style={{ fontSize: '14px', color: '#475569' }}>Tax Amount</span>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>₹ {parseFloat(selectedInvoice.taxAmount || 0).toFixed(2)}</span>
                      </div>
                      <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>Grand Total</span>
                        <span style={{ fontSize: '20px', fontWeight: '700', color: '#3b82f6' }}>₹ {parseFloat(selectedInvoice.grandTotal || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AllInvoicesPage() {
  return (
    <Suspense fallback={<div>Loading invoices...</div>}>
      <InvoicesContent />
    </Suspense>
  );
}
