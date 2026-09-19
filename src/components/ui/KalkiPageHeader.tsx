import React, { ReactNode } from 'react';

export interface KalkiPageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
}

export function KalkiPageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: KalkiPageHeaderProps) {
  return (
    <header className="kalki-page-header">
      <div className="kalki-page-header-content">
        {breadcrumbs && (
          <div className="kalki-breadcrumbs">
            {breadcrumbs}
          </div>
        )}
        <div className="kalki-page-title-row">
          <div>
            <h1 className="kalki-page-title">{title}</h1>
            {description && <p className="kalki-page-description">{description}</p>}
          </div>
          {actions && <div className="kalki-page-actions">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
