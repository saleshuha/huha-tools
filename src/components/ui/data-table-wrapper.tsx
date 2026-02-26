import * as React from "react"
import { cn } from "@/lib/utils"

interface DataTableWrapperProps {
  children: React.ReactNode
  className?: string
  maxHeight?: string
}

export function DataTableWrapper({ children, className, maxHeight = "500px" }: DataTableWrapperProps) {
  return (
    <div className={cn(
      "border border-border rounded-xl overflow-hidden bg-card",
      className
    )}>
      <div className="overflow-auto" style={{ maxHeight }}>
        {children}
      </div>
    </div>
  )
}

/** Apply to <TableHeader> for consistent styling */
export const dataTableHeaderClass = "sticky top-0 bg-muted/40 border-b border-border z-10"

/** Apply to <TableHead> cells */
export const dataTableHeadClass = "text-xs font-medium uppercase tracking-wider text-muted-foreground"

/** Apply to <TableRow> for zebra striping - pass the row index */
export function dataTableRowClass(index: number) {
  return cn(
    "transition-colors hover:bg-muted/20",
    index % 2 === 1 && "bg-muted/10"
  )
}

interface DataTableFooterProps {
  children: React.ReactNode
  className?: string
}

export function DataTableFooter({ children, className }: DataTableFooterProps) {
  return (
    <div className={cn(
      "flex items-center justify-between p-3 border-t border-border text-sm text-muted-foreground",
      className
    )}>
      {children}
    </div>
  )
}
