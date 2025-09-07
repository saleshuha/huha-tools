import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "atlas-input min-h-[80px] px-3 py-2 border border-border rounded-lg resize-none",
          "[data-theme-style='flat']:focus-visible:ring-2 [data-theme-style='flat']:focus-visible:ring-ring",
          "[data-theme-style='mercury']:focus:shadow-glow [data-theme-style='mercury']:focus:bg-surface",
          "[data-density='comfortable']:min-h-[120px] [data-density='comfortable']:px-4 [data-density='comfortable']:py-3",
          "[data-density='compact']:min-h-[80px] [data-density='compact']:px-3 [data-density='compact']:py-2",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
