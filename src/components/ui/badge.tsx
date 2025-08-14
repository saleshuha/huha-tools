import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-sm shadow-soft hover:shadow-medium hover:scale-105",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-primary to-primary-light text-primary-foreground hover:from-primary-dark hover:to-primary hover:shadow-glow",
        secondary:
          "border-transparent bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground hover:from-secondary/90 hover:to-secondary",
        destructive:
          "border-transparent bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground hover:from-destructive/90 hover:to-destructive",
        outline: "border-border/60 bg-card/50 text-foreground hover:bg-card hover:border-primary/50",
        success: "border-transparent bg-gradient-to-r from-success to-emerald-light text-success-foreground hover:shadow-emerald-glow",
        warning: "border-transparent bg-gradient-to-r from-warning to-orange text-warning-foreground hover:shadow-orange-glow",
        accent: "border-transparent bg-gradient-to-r from-accent to-sky text-accent-foreground hover:shadow-accent-glow",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
