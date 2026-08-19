import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * The ring is drawn with `border-current`, so its colour comes from whatever
 * `text-*` class the call site (or its parent) already sets. That keeps the
 * spinner on the app's semantic tokens instead of baking in a colour, which is
 * what the four loading idioms this replaces each did differently.
 *
 * Sizes are literal classes on purpose. The `PreLoader` this supersedes built
 * them as `h-${size} w-${size}`, which Tailwind's scanner cannot see — those
 * classes only rendered when some unrelated file happened to use the same
 * utility, and `size="[100px]"` produced no size at all.
 */
const spinnerVariants = cva(
  "inline-block shrink-0 animate-spin rounded-full border-solid border-current border-t-transparent motion-reduce:animate-none",
  {
    variants: {
      size: {
        xs: "h-3 w-3 border-2",
        sm: "h-4 w-4 border-2",
        md: "h-6 w-6 border-2",
        lg: "h-8 w-8 border-2",
        xl: "h-16 w-16 border-4",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

/**
 * Indeterminate loading indicator.
 *
 * @param {Object} props
 * @param {"xs"|"sm"|"md"|"lg"|"xl"} [props.size]
 * @param {string} [props.className]
 * @param {string} [props.label] Accessible name announced to screen readers.
 */
const Spinner = React.forwardRef(
  ({ className, size, label = "Loading", ...props }, ref) => (
    <span
      ref={ref}
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center justify-center", className)}
      {...props}
    >
      <span aria-hidden="true" className={cn(spinnerVariants({ size }))} />
      <span className="sr-only">{label}</span>
    </span>
  )
);
Spinner.displayName = "Spinner";

/**
 * Centres a Spinner in whatever box it is given. Replaces the
 * `w-full h-full flex justify-center items-center` wrapper that every loading
 * branch in the settings pages hand-rolled around its spinner.
 */
function SpinnerBlock({ className, size = "xl", label, ...props }) {
  return (
    <div
      className={cn(
        "flex w-full flex-1 items-center justify-center py-10 text-primary",
        className
      )}
      {...props}
    >
      <Spinner size={size} label={label} />
    </div>
  );
}

export { Spinner, SpinnerBlock, spinnerVariants };
