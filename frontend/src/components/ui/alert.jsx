import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Inline status message.
 *
 * `warning` and `success` are not stock shadcn/ui — the app needs them (the
 * settings pages already show amber "this will restart the instance" and green
 * "saved" notices), and adding them here is what stops those notices being
 * re-invented with a different amber at each call site. They are expressed as
 * tints of the existing palette rather than as new tokens.
 */
const alertVariants = cva(
  "relative flex w-full gap-x-3 rounded-lg border p-4 text-sm [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:translate-y-0.5",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground",
        // The body text is --theme-text-primary, not --destructive-foreground:
        // that token is white in both themes and would be unreadable on this
        // pale tint in light mode. The icon carries the destructive colour.
        destructive:
          "border-destructive/40 bg-destructive/10 text-theme-text-primary [&>svg]:text-destructive",
        warning:
          "border-amber-500/40 bg-amber-500/10 text-theme-text-primary [&>svg]:text-amber-500",
        success:
          "border-emerald-500/40 bg-emerald-500/10 text-theme-text-primary [&>svg]:text-emerald-500",
        info: "border-primary/40 bg-primary/10 text-theme-text-primary [&>svg]:text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    data-slot="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    data-slot="alert-title"
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="alert-description"
    className={cn(
      "text-xs leading-[18px] opacity-90 [&_p]:leading-relaxed",
      className
    )}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription, alertVariants };
