"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "../../lib/utils"

/* Dark redesign: thinner height + gradient bar.
   Fixes:
   - Pass value to Root for Radix state.
   - Clamp value to [0,100].
   - Use transform translateX with clamped pct.
   - Add aria attributes for accessibility.
*/
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const pct = Math.min(100, Math.max(0, value ?? 0))
  return (
    <ProgressPrimitive.Root
      ref={ref}
      value={pct}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "relative h-3 w-full overflow-hidden rounded-full bg-secondary/40 ring-1 ring-inset ring-border/40",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-gradient-to-r from-primary via-accent to-primary transition-transform duration-500 ease-out will-change-transform shadow-[0_0_0_1px_rgba(255,255,255,0.05)]"
        style={{ transform: `translateX(-${100 - pct}%)` }}
      />
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
