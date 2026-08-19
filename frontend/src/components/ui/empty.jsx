import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Empty / zero-result state.
 *
 * Modelled on the reference's slot family (Empty > Header > Media + Title +
 * Description, then Content for the call to action) rather than a single
 * `<EmptyState title description />` component. The slots are what let a page
 * put a table's "no rows yet" and a search's "no matches" on the same spacing
 * and hierarchy while saying different things, which is the inconsistency this
 * is here to fix.
 */
const Empty = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="empty"
    className={cn(
      "flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-y-4 text-balance rounded-lg px-6 py-12 text-center",
      className
    )}
    {...props}
  />
));
Empty.displayName = "Empty";

const EmptyHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="empty-header"
    className={cn("flex max-w-sm flex-col items-center gap-y-2", className)}
    {...props}
  />
));
EmptyHeader.displayName = "EmptyHeader";

const emptyMediaVariants = cva(
  "flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Bare glyph, for a state that should stay quiet. */
        default: "mb-2 text-muted-foreground [&_svg]:size-8",
        /** Glyph in a tinted tile, for a state that is the page's main content. */
        icon: "mb-2 size-12 rounded-lg bg-muted text-muted-foreground [&_svg]:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const EmptyMedia = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    aria-hidden="true"
    data-slot="empty-media"
    className={cn(emptyMediaVariants({ variant }), className)}
    {...props}
  />
));
EmptyMedia.displayName = "EmptyMedia";

const EmptyTitle = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    data-slot="empty-title"
    className={cn("text-sm font-medium text-theme-text-primary", className)}
    {...props}
  />
));
EmptyTitle.displayName = "EmptyTitle";

const EmptyDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    data-slot="empty-description"
    className={cn(
      "text-xs leading-[18px] text-theme-text-secondary [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
      className
    )}
    {...props}
  />
));
EmptyDescription.displayName = "EmptyDescription";

/** Slot for the action that resolves the empty state, e.g. a "New key" button. */
const EmptyContent = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="empty-content"
    className={cn(
      "flex w-full max-w-sm min-w-0 flex-col items-center gap-y-2 text-balance",
      className
    )}
    {...props}
  />
));
EmptyContent.displayName = "EmptyContent";

export {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  emptyMediaVariants,
};
