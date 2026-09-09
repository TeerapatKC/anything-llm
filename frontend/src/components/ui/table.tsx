"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

/**
 * The bordered, rounded container is what makes a shadcn table read as one
 * surface rather than loose rows sitting on the page background.
 */
function Table({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<"table"> & { containerClassName?: string }) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        "relative w-full overflow-x-auto rounded-lg border",
        containerClassName
      )}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-muted/50 [&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

/**
 * Lucide's `table` icon, inlined as a data-URI mask for the `.shimmer-mask` sweep.
 */
const TABLE_ICON_MASK = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 3v18'/%3E%3Crect width='18' height='18' x='3' y='3' rx='2'/%3E%3Cpath d='M3 9h18'/%3E%3Cpath d='M3 15h18'/%3E%3C/svg%3E")`

/**
 * Animated loading row displaying a table icon with shimmer mask animation and loading text.
 */
function TableLoadingRow({
  colSpan,
  children,
  className,
  ...props
}: React.ComponentProps<"tr"> & {
  colSpan?: number
  children?: React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <TableRow className={cn("hover:bg-transparent", className)} {...props}>
      <TableCell colSpan={colSpan} className="p-0">
        <div
          role="status"
          aria-busy="true"
          className="relative flex w-full flex-col items-center justify-center gap-y-4 py-16"
        >
          <div
            className="shimmer-mask size-12"
            style={
              {
                "--shimmer-mask": TABLE_ICON_MASK,
                "--shimmer-tile": "6.5rem",
                animationDuration: "0.95s",
              } as React.CSSProperties
            }
          />
          <span className="text-shimmer font-mono text-sm">
            {children || t("common.loading", "Loading...")}
          </span>
        </div>
      </TableCell>
    </TableRow>
  )
}

/**
 * App addition on top of the stock shadcn table: the "nothing here yet" row the
 * settings tables render inside their own <tbody>, built out of the Empty
 * primitives so the copy and spacing stay consistent with the rest of the app.
 */
function TableEmptyRow({
  colSpan,
  icon,
  children,
  description,
  action,
  className,
  ...props
}: React.ComponentProps<"tr"> & {
  colSpan?: number
  icon?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <TableRow className={cn("hover:bg-transparent", className)} {...props}>
      <TableCell colSpan={colSpan} className="p-0">
        <Empty className="py-10">
          <EmptyHeader>
            {icon ? <EmptyMedia>{icon}</EmptyMedia> : null}
            <EmptyTitle>{children}</EmptyTitle>
            {description ? (
              <EmptyDescription>{description}</EmptyDescription>
            ) : null}
          </EmptyHeader>
          {action ? <EmptyContent>{action}</EmptyContent> : null}
        </Empty>
      </TableCell>
    </TableRow>
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableEmptyRow,
  TableLoadingRow,
}
