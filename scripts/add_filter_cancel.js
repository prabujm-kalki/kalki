const fs = require('fs');

let code = fs.readFileSync('src/app/sales/invoices/all/page.tsx', 'utf8');

// 1. Add useRef to imports
code = code.replace(
  'import React, { useEffect, useState, useMemo } from "react";',
  'import React, { useEffect, useState, useMemo, useRef } from "react";'
);

// 2. Add ref state and useEffect for click outside
const refLogic = `  const filterRef = useRef<HTMLDivElement>(null);

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
`;

// Insert after filter states
code = code.replace(
  /paymentStatus: ""\n  \}\);\n/g,
  'paymentStatus: ""\n  });\n\n' + refLogic
);

// 3. Attach ref to the filter wrapper
code = code.replace(
  '<div style={{ position: \'relative\' }}>\n            <button',
  '<div ref={filterRef} style={{ position: \'relative\' }}>\n            <button'
);

// 4. Add Cancel button next to Apply Filters
const applyButtonDiv = `<div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setIsFilterOpen(false)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>Apply Filters</button>
                </div>`;
                
const applyCancelButtons = `<div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button onClick={() => setIsFilterOpen(false)} style={{ background: 'white', color: '#64748b', border: '1px solid #cbd5e1', padding: '8px 20px', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}>Cancel</button>
                  <button onClick={() => setIsFilterOpen(false)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>Apply Filters</button>
                </div>`;

code = code.replace(applyButtonDiv, applyCancelButtons);

fs.writeFileSync('src/app/sales/invoices/all/page.tsx', code);
console.log('Added click-outside handler and Cancel button to filters.');
