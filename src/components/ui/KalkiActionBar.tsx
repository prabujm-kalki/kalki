import React, { ReactNode } from 'react';

export interface KalkiActionBarProps {
  children: ReactNode;
  className?: string;
}

export function KalkiActionBar({ children, className = '' }: KalkiActionBarProps) {
  return (
    <div className={`kalki-action-bar ${className}`}>
      {children}
    </div>
  );
}
