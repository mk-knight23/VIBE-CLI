"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "../../lib/utils"

const Tabs = TabsPrimitive.Root

/* Dark redesign: gradient active tab, subtle glow container */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-1 rounded-xl bg-card/50 p-1 backdrop-blur-sm border border-border/50 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]",
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
      "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-xs md:text-sm font-medium tracking-wide " +
        "text-muted-foreground transition-all ease-smooth disabled:pointer-events-none disabled:opacity-50 " +
        "data-[state=active]:text-foreground data-[state=active]:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_4px_12px_-2px_rgba(34,211,238,0.35)] " +
        "data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent " +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
        "hover:bg-accent/10 hover:text-foreground",
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
      "mt-6 rounded-xl border border-border/40 bg-card/40 p-6 backdrop-blur-sm animate-in fade-in-50 slide-in-from-top-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
