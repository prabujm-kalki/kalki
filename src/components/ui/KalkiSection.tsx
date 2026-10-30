import React, { ReactNode } from 'react';
import { KalkiCard } from './KalkiCard';

export interface KalkiSectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  defaultExpanded?: boolean;
  headerAction?: ReactNode;
}

export function KalkiSection({
  title,
  icon,
  children,
  className = '',
  headerAction,
}: KalkiSectionProps) {
  // For simplicity, we make sections always expanded for now. 
  // Can be enhanced with collapsible state if required.
  return (
    <KalkiCard padding="none" className={`kalki-section ${className}`}>
      <div className="kalki-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 className="kalki-section-title">
          {icon && <span className="kalki-section-icon">{icon}</span>}
          {title}
        </h3>
        {headerAction && <div>{headerAction}</div>}
      </div>
      <div className="kalki-section-content">
        {children}
      </div>
    </KalkiCard>
  );
}
