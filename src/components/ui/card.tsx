import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "atlas-card rounded-lg",
      "[data-theme-style='flat']:border [data-theme-style='flat']:shadow-sm",
      "[data-theme-style='mercury']:shadow-soft [data-theme-style='mercury']:hover:shadow-md [data-theme-style='mercury']:backdrop-blur-sm",
      "transition-all duration-200",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-2 border-b border-border/40 rounded-t-lg",
      "[data-density='comfortable']:p-6 [data-density='compact']:p-4",
      "[data-theme-style='flat']:bg-surface-variant/50",
      "[data-theme-style='mercury']:bg-surface-container/50 [data-theme-style='mercury']:backdrop-blur-sm",
      className
    )}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-semibold leading-tight tracking-tight text-foreground",
      "[data-density='comfortable']:text-lg [data-density='compact']:text-base",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-foreground-muted leading-relaxed", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn(
      "space-y-3",
      "[data-density='comfortable']:p-6 [data-density='compact']:p-4",
      className
    )} 
    {...props} 
  />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center gap-3 border-t border-border/40 rounded-b-lg",
      "[data-density='comfortable']:p-6 [data-density='comfortable']:pt-4",
      "[data-density='compact']:p-4 [data-density='compact']:pt-3",
      "[data-theme-style='flat']:bg-surface-variant/30",
      "[data-theme-style='mercury']:bg-surface-container/30 [data-theme-style='mercury']:backdrop-blur-sm",
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
