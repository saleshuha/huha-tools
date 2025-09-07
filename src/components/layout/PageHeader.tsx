import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function PageHeader({ children, className }: PageHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col gap-2 pb-4 border-b border-border",
      "[data-density='comfortable']:mb-6 [data-density='compact']:mb-4",
      className
    )}>
      {children}
    </div>
  );
}

interface PageTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTitle({ children, className }: PageTitleProps) {
  return (
    <h1 className={cn(
      "text-2xl font-semibold tracking-tight text-foreground",
      "[data-density='compact']:text-xl",
      className
    )}>
      {children}
    </h1>
  );
}

interface PageDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageDescription({ children, className }: PageDescriptionProps) {
  return (
    <p className={cn(
      "text-sm text-foreground-muted",
      className
    )}>
      {children}
    </p>
  );
}