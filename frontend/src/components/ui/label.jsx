import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const labelVariants = cva("", {
  variants: {
    variant: {
      // Stock shadcn/ui label.
      default:
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      // The look used by every provider settings form. `mb-3` is intentionally
      // left out — the call sites vary between mb-3, mb-2 and no margin, so
      // spacing stays with the caller.
      settings: "text-theme-text-primary text-sm font-semibold",
    },
  },
  defaultVariants: { variant: "default" },
});

const Label = React.forwardRef(({ className, variant, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants({ variant }), className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label, labelVariants };
