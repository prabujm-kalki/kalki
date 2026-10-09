"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function Pagination({ totalPages, currentPage }: { totalPages: number; currentPage: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [jumpPage, setJumpPage] = useState("");

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    return `${pathname}?${params.toString()}`;
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      router.push(createPageUrl(page));
    }
  };

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPage, 10);
    if (!isNaN(pageNum)) {
      goToPage(pageNum);
      setJumpPage("");
    }
  };

  // Calculate page range to show (max 5 pages)
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);

  if (endPage - startPage < 4) {
    if (startPage === 1) {
      endPage = Math.min(totalPages, 5);
    } else if (endPage === totalPages) {
      startPage = Math.max(1, totalPages - 4);
    }
  }

  const pages = [];
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  if (totalPages <= 1) return null;

  const btnStyle = {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    backgroundColor: "white",
    color: "#334155",
    fontSize: "14px",
    cursor: "pointer",
    fontWeight: "500",
  };

  const activeBtnStyle = {
    ...btnStyle,
    backgroundColor: "#d97706",
    color: "white",
    borderColor: "#d97706",
  };

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
      <div style={{ fontSize: "14px", color: "#64748b" }}>
        Page {currentPage} of {totalPages}
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          style={{ ...btnStyle, opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
        >
          Previous
        </button>

        {startPage > 1 && (
          <>
            <button onClick={() => goToPage(1)} style={btnStyle}>1</button>
            {startPage > 2 && <span style={{ color: "#94a3b8" }}>...</span>}
          </>
        )}

        {pages.map(page => (
          <button
            key={page}
            onClick={() => goToPage(page)}
            style={page === currentPage ? activeBtnStyle : btnStyle}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span style={{ color: "#94a3b8" }}>...</span>}
            <button onClick={() => goToPage(totalPages)} style={btnStyle}>{totalPages}</button>
          </>
        )}

        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{ ...btnStyle, opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
        >
          Next
        </button>

        <form onSubmit={handleJump} style={{ display: "flex", gap: "4px", marginLeft: "16px" }}>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value)}
            placeholder="Go to"
            style={{ width: "60px", padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none" }}
          />
          <button type="submit" style={{ ...btnStyle, padding: "6px" }}>Go</button>
        </form>
      </div>
    </div>
  );
}
