import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-lg bg-muted p-1",
      "[data-theme-style='flat']:bg-surface-variant [data-theme-style='flat']:border [data-theme-style='flat']:border-border",
      "[data-theme-style='mercury']:bg-muted/60 [data-theme-style='mercury']:backdrop-blur-sm",
      "[data-density='comfortable']:p-1 [data-density='compact']:p-0.5",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      "[data-theme-style='flat']:data-[state=active]:bg-surface [data-theme-style='flat']:data-[state=active]:border [data-theme-style='flat']:data-[state=active]:border-border",
      "[data-theme-style='mercury']:data-[state=active]:shadow-soft [data-theme-style='mercury']:data-[state=active]:backdrop-blur-sm",
      "[data-density='comfortable']:px-4 [data-density='comfortable']:py-2.5",
      "[data-density='compact']:px-3 [data-density='compact']:py-2 [data-density='compact']:text-xs",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "[data-density='comfortable']:mt-4 [data-density='compact']:mt-3",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
