import React, { ReactNode } from 'react';
import { KalkiCard } from './KalkiCard';

export interface KalkiSectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  defaultExpanded?: boolean;
}

export function KalkiSection({
  title,
  icon,
  children,
  className = '',
}: KalkiSectionProps) {
  // For simplicity, we make sections always expanded for now. 
  // Can be enhanced with collapsible state if required.
  return (
    <KalkiCard padding="none" className={`kalki-section ${className}`}>
      <div className="kalki-section-header">
        <h3 className="kalki-section-title">
          {icon && <span className="kalki-section-icon">{icon}</span>}
          {title}
        </h3>
      </div>
      <div className="kalki-section-content">
        {children}
      </div>
    </KalkiCard>
  );
}
