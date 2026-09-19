import React, { HTMLAttributes } from 'react';

export interface KalkiCardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function KalkiCard({ children, className = '', padding = 'md', ...props }: KalkiCardProps) {
  return (
    <div className={`kalki-card kalki-card--p-${padding} ${className}`} {...props}>
      {children}
    </div>
  );
}
