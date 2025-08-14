import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold tracking-wide transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-soft hover:shadow-medium hover:scale-105",
  {
    variants: {
      variant: {
        default: "border-0 bg-gradient-primary text-primary-foreground hover:shadow-glow",
        secondary: "border-0 bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground",
        destructive: "border-0 bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground",
        success: "border-0 bg-gradient-nature text-success-foreground hover:shadow-emerald-glow",
        warning: "border-0 bg-gradient-to-r from-warning to-warning/90 text-warning-foreground",
        info: "border-0 bg-gradient-ocean text-info-foreground hover:shadow-sky-glow",
        accent: "border-0 bg-gradient-accent text-accent-foreground hover:shadow-accent-glow",
        outline: "border-2 border-primary/50 bg-transparent text-primary hover:bg-gradient-primary/10 hover:border-primary",
        ghost: "border-0 bg-muted/20 text-muted-foreground hover:bg-muted/40",
        premium: "border-0 bg-gradient-hero text-primary-foreground hover:shadow-dramatic",
        emerald: "border-0 bg-gradient-emerald text-emerald-foreground hover:shadow-emerald-glow",
        sky: "border-0 bg-gradient-sky text-sky-foreground hover:shadow-sky-glow",
        cyan: "border-0 bg-gradient-cyan text-cyan-foreground hover:shadow-cyan-glow",
        violet: "border-0 bg-gradient-to-r from-violet to-violet/90 text-violet-foreground hover:shadow-violet-glow",
      },
      size: {
        default: "px-3 py-1.5 text-xs",
        sm: "px-2 py-1 text-xs",
        lg: "px-4 py-2 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
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
