import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Every part takes a `variant`:
 *
 * - `default` is stock shadcn/ui.
 * - `settings` is the look the admin and settings tables repeat, lifted
 *   verbatim so adopting it changes nothing on screen.
 * - `none` adds nothing, for the tables that style themselves.
 *
 * Table also drops shadcn's `relative w-full overflow-auto` wrapper for the two
 * app variants: these tables already sit inside their own scroll containers, and
 * adding a second one would change how they lay out.
 */
const tableVariants = cva("", {
  variants: {
    variant: {
      default: "w-full caption-bottom text-sm",
      settings:
        "w-full text-xs text-left rounded-lg min-w-[640px] border-spacing-0",
      none: "",
    },
  },
  defaultVariants: { variant: "default" },
});

const headerVariants = cva("", {
  variants: {
    variant: {
      default: "[&_tr]:border-b",
      settings:
        "text-theme-text-secondary text-xs leading-[18px] font-bold uppercase border-white/10 border-b",
      none: "",
    },
  },
  defaultVariants: { variant: "default" },
});

const rowVariants = cva("", {
  variants: {
    variant: {
      default:
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      settings: "bg-transparent text-theme-text-secondary text-sm font-medium",
      none: "",
    },
  },
  defaultVariants: { variant: "default" },
});

const bodyVariants = cva("", {
  variants: {
    variant: {
      default: "[&_tr:last-child]:border-0",
      none: "",
    },
  },
  defaultVariants: { variant: "default" },
});

const headVariants = cva("", {
  variants: {
    variant: {
      default:
        "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      none: "",
    },
  },
  defaultVariants: { variant: "default" },
});

const cellVariants = cva("", {
  variants: {
    variant: {
      default: "p-4 align-middle [&:has([role=checkbox])]:pr-0",
      none: "",
    },
  },
  defaultVariants: { variant: "default" },
});

const Table = React.forwardRef(({ className, variant, ...props }, ref) => {
  const table = (
    <table
      ref={ref}
      className={cn(tableVariants({ variant }), className)}
      {...props}
    />
  );
  if (variant === "settings" || variant === "none") return table;
  return <div className="relative w-full overflow-auto">{table}</div>;
});
Table.displayName = "Table";

const TableHeader = React.forwardRef(
  ({ className, variant, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn(headerVariants({ variant }), className)}
      {...props}
    />
  )
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef(({ className, variant, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn(bodyVariants({ variant }), className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef(({ className, variant, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(rowVariants({ variant }), className)}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef(({ className, variant, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(headVariants({ variant }), className)}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef(({ className, variant, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(cellVariants({ variant }), className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
