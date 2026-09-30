"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function CreatePOButton() {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const href = `/purchasing/purchase-orders/create${query ? '?' + query : ''}`;

  return (
    <Link href={href} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', fontSize: '0.875rem', textDecoration: 'none' }}>
      + Create New Purchase Order
    </Link>
  );
}
