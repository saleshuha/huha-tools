import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface MobileTableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  forceCardView?: boolean;
}

export function MobileTable({ 
  children, 
  className, 
  forceCardView = false,
  ...props 
}: MobileTableProps) {
  const isMobile = useIsMobile();
  const shouldUseCardView = isMobile || forceCardView;

  return (
    <div 
      className={cn(
        "data-table",
        shouldUseCardView && "table-card-view",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface MobileTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  label?: string;
}

export function MobileTableCell({ 
  children, 
  label, 
  className, 
  ...props 
}: MobileTableCellProps) {
  return (
    <td 
      className={cn("p-2", className)}
      data-label={label}
      {...props}
    >
      {children}
    </td>
  );
}