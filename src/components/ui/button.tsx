import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-wide ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden group",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-primary-foreground hover:shadow-glow hover:scale-105 border-0 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transform before:-skew-x-12 before:-translate-x-full before:transition-transform before:duration-700 hover:before:translate-x-full",
        destructive: "bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground hover:shadow-medium hover:scale-105 border-0",
        outline: "border-2 border-border/50 bg-background/50 backdrop-blur-sm hover:bg-gradient-primary/10 hover:border-primary hover:text-primary hover:shadow-soft",
        secondary: "bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground hover:shadow-medium hover:scale-105 border-0",
        ghost: "bg-transparent hover:bg-gradient-primary/10 hover:text-primary hover:shadow-soft border-0",
        link: "text-primary underline-offset-4 hover:underline bg-transparent border-0 hover:bg-gradient-primary/5 rounded-lg",
        accent: "bg-gradient-accent text-accent-foreground hover:shadow-accent-glow hover:scale-105 border-0",
        success: "bg-gradient-nature text-success-foreground hover:shadow-emerald-glow hover:scale-105 border-0",
        warning: "bg-gradient-to-r from-warning to-warning/90 text-warning-foreground hover:shadow-medium hover:scale-105 border-0",
        info: "bg-gradient-ocean text-info-foreground hover:shadow-sky-glow hover:scale-105 border-0",
        elegant: "bg-gradient-to-br from-card via-card/95 to-card/90 border-2 border-primary/20 text-foreground hover:bg-gradient-primary/10 hover:border-primary hover:text-primary hover:shadow-soft backdrop-blur-sm",
        premium: "bg-gradient-hero text-primary-foreground hover:shadow-dramatic hover:scale-105 border-0 shadow-elegant",
      },
      size: {
        default: "h-11 px-6 py-3",
        sm: "h-9 px-4 py-2 text-xs",
        lg: "h-13 px-8 py-4 text-base",
        xl: "h-16 px-10 py-5 text-lg",
        icon: "h-11 w-11",
        "icon-sm": "h-9 w-9",
        "icon-lg": "h-13 w-13",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
