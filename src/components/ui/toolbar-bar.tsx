import * as React from "react"
import { cn } from "@/lib/utils"

interface ToolbarBarProps {
  children: React.ReactNode
  className?: string
}

export function ToolbarBar({ children, className }: ToolbarBarProps) {
  return (
    <div className={cn(
      "flex flex-wrap items-center gap-3 p-3 rounded-xl bg-card border border-border",
      className
    )}>
      {children}
    </div>
  )
}

export function ToolbarSpacer() {
  return <div className="flex-1" />
}
