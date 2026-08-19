import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Surface container. Stock shadcn/ui, on this app's semantic tokens.
 *
 * The reference (shadcn.io) splits a card into Header / Title / Description /
 * Action / Content / Footer slots rather than exposing one padded box; that
 * composition is what keeps card spacing identical everywhere, so it is kept.
 * Padding lives on the slots, not on the root.
 */
const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card"
    className={cn(
      "flex flex-col rounded-lg border border-border bg-card text-card-foreground",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

/**
 * Two-column grid so a `CardAction` can sit flush right of the title without
 * the title block needing to know it is there.
 */
const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-header"
    className={cn(
      "grid auto-rows-min grid-rows-[auto_auto] items-start gap-y-1 p-6 has-[[data-slot=card-action]]:grid-cols-[1fr_auto]",
      className
    )}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    data-slot="card-title"
    className={cn(
      "text-base font-semibold leading-6 tracking-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    data-slot="card-description"
    className={cn("text-xs leading-[18px] text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

/** Trailing control in the header, e.g. a menu or a toggle. */
const CardAction = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-action"
    className={cn(
      "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
      className
    )}
    {...props}
  />
));
CardAction.displayName = "CardAction";

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-content"
    className={cn("p-6 pt-0", className)}
    {...props}
  />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-footer"
    className={cn("flex items-center gap-x-2 p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
