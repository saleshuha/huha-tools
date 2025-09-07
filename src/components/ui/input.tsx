import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "atlas-input h-10 px-3 py-2 border border-border rounded-lg",
          "[data-theme-style='flat']:focus-visible:ring-2 [data-theme-style='flat']:focus-visible:ring-ring",
          "[data-theme-style='mercury']:focus:shadow-glow [data-theme-style='mercury']:focus:bg-surface",
          "[data-density='comfortable']:h-11 [data-density='comfortable']:px-4 [data-density='comfortable']:py-3",
          "[data-density='compact']:h-9 [data-density='compact']:px-3 [data-density='compact']:py-2",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
