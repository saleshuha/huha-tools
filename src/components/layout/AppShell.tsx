import * as React from "react";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
  return (
    <div className={cn(
      "min-h-screen bg-background text-foreground",
      "[data-theme-style='flat'] &:bg-background [data-theme-style='flat'] &:text-foreground",
      className
    )}>
      {children}
    </div>
  );
}

interface AppMainProps {
  children: React.ReactNode;
  className?: string;
}

export function AppMain({ children, className }: AppMainProps) {
  return (
    <main className={cn(
      "flex-1 container mx-auto",
      "[data-density='comfortable']:p-6 [data-density='compact']:p-4",
      className
    )}>
      {children}
    </main>
  );
}

interface AppHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function AppHeader({ children, className }: AppHeaderProps) {
  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/60",
      "[data-header-style='compact']:h-14 [data-header-style='default']:h-16 [data-header-style='spacious']:h-20",
      "[data-density='comfortable']:px-6 [data-density='compact']:px-4",
      className
    )}>
      <div className="container flex h-full items-center">
        {children}
      </div>
    </header>
  );
}