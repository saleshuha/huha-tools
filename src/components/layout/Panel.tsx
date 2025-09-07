import * as React from "react";
import { cn } from "@/lib/utils";

interface PanelProps {
  children: React.ReactNode;
  className?: string;
}

export function Panel({ children, className }: PanelProps) {
  return (
    <div className={cn(
      "atlas-panel rounded-xl",
      "[data-theme-style='flat']:shadow-none [data-theme-style='mercury']:shadow-soft",
      "[data-density='comfortable']:p-6 [data-density='compact']:p-4",
      className
    )}>
      {children}
    </div>
  );
}

interface PanelHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function PanelHeader({ children, className }: PanelHeaderProps) {
  return (
    <div className={cn(
      "flex items-center justify-between pb-4 border-b border-border",
      "[data-density='comfortable']:mb-4 [data-density='compact']:mb-3",
      className
    )}>
      {children}
    </div>
  );
}

interface PanelTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function PanelTitle({ children, className }: PanelTitleProps) {
  return (
    <h3 className={cn(
      "text-lg font-medium text-foreground",
      "[data-density='compact']:text-base",
      className
    )}>
      {children}
    </h3>
  );
}

interface PanelContentProps {
  children: React.ReactNode;
  className?: string;
}

export function PanelContent({ children, className }: PanelContentProps) {
  return (
    <div className={cn(
      "space-y-4",
      "[data-density='compact']:space-y-3",
      className
    )}>
      {children}
    </div>
  );
}