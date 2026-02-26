import * as React from "react"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

export interface StatItem {
  icon: LucideIcon
  label: string
  value: string | number
  highlight?: boolean
  onClick?: () => void
  isActive?: boolean
}

interface CompactStatBarProps {
  items: StatItem[]
  className?: string
}

export function CompactStatBar({ items, className }: CompactStatBarProps) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 p-2.5 rounded-xl bg-card border border-border overflow-x-auto",
      className
    )}>
      {items.map((item, index) => {
        const Icon = item.icon
        return (
          <button
            key={index}
            type="button"
            onClick={item.onClick}
            disabled={!item.onClick}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all",
              item.highlight
                ? "bg-primary/10 text-primary font-semibold"
                : "bg-muted/50 text-foreground",
              item.isActive && "ring-2 ring-primary/40 bg-primary/15",
              item.onClick && "hover:bg-muted/80 cursor-pointer",
              !item.onClick && "cursor-default"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{item.label}</span>
            <span className="font-semibold text-sm">
              {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
            </span>
          </button>
        )
      })}
    </div>
  )
}
