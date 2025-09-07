import React from 'react';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn("min-h-screen bg-gradient-surface", className)}>
      <div className="w-full px-4 md:px-6 py-4 animate-fade-in">
        {children}
      </div>
    </div>
  );
};