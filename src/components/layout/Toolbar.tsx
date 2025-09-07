import * as React from "react";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export function Toolbar({ children, className }: ToolbarProps) {
  return (
    <div className={cn(
      "flex items-center justify-between gap-4 py-4",
      "[data-density='compact']:py-3 [data-density='compact']:gap-3",
      className
    )}>
      {children}
    </div>
  );
}

interface ToolbarSectionProps {
  children: React.ReactNode;
  className?: string;
}

export function ToolbarSection({ children, className }: ToolbarSectionProps) {
  return (
    <div className={cn(
      "flex items-center gap-3",
      "[data-density='compact']:gap-2",
      className
    )}>
      {children}
    </div>
  );
}

interface ToolbarSeparatorProps {
  className?: string;
}

export function ToolbarSeparator({ className }: ToolbarSeparatorProps) {
  return (
    <div className={cn(
      "w-px h-6 bg-border",
      className
    )} />
  );
}