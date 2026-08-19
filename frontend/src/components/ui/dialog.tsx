import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * One width scale for every dialog in the app, instead of the eleven one-off
 * `max-w-[550px]`-style values the call sites used to carry. `lg` is the
 * default because it matches what the large majority of them already were.
 */
const dialogSizes = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-3xl",
  "2xl": "sm:max-w-4xl",
} as const

/**
 * `min-h-0` is what lets the box shrink past its content once the popup hits
 * its max height — that is the whole trick that hands it the scrollbar. `mt-6`
 * starts it below the close button so the scrollbar never runs up against it,
 * and `pr-2` keeps the text off the bar.
 */
const BODY_CLASS =
  "flex min-h-0 flex-col gap-4 overflow-x-hidden overflow-y-auto pr-2"

const isSlot = (node: React.ReactNode, slot: React.ElementType) =>
  React.isValidElement(node) && node.type === slot

/**
 * Lay a dialog's children out as [header][scrolling body][footer].
 *
 * Call sites write three shapes. The first two are split apart here:
 *
 *   <DialogContent>          <DialogContent>
 *     <DialogHeader/>          <DialogHeader/>
 *     …body…                   <form>…body…<DialogFooter/></form>
 *     <DialogFooter/>        </DialogContent>
 *   </DialogContent>
 *
 * The third renders a whole child component that owns its own header and
 * footer (`<DialogContent><NewUserModal/></DialogContent>` — 17 of them do
 * this). Those slots are invisible from here, so they land inside the scrolling
 * body; `DialogHeader`/`DialogFooter` carry `sticky` for exactly that case, and
 * that is also why the footer must not use negative margins — the body box
 * clips horizontally.
 */
function splitDialogSlots(children: React.ReactNode): React.ReactNode {
  const items = React.Children.toArray(children)
  const header = items.filter((c) => isSlot(c, DialogHeader))
  const footer = items.filter((c) => isSlot(c, DialogFooter))
  const rest = items.filter(
    (c) => !isSlot(c, DialogHeader) && !isSlot(c, DialogFooter)
  )

  // Shape 2: a lone wrapper holding the header and/or footer of its own.
  if (footer.length === 0 && rest.length === 1 && React.isValidElement(rest[0])) {
    const wrapper = rest[0] as React.ReactElement<{
      children?: React.ReactNode
      className?: string
    }>
    const inner = React.Children.toArray(wrapper.props.children)
    const hasSlot = inner.some(
      (c) => isSlot(c, DialogHeader) || isSlot(c, DialogFooter)
    )
    if (hasSlot) {
      return (
        <>
          {header}
          {React.cloneElement(
            wrapper,
            {
              className: cn("flex min-h-0 flex-col gap-4", wrapper.props.className),
            },
            splitDialogSlots(wrapper.props.children)
          )}
        </>
      )
    }
  }

  return (
    <>
      {header}
      {rest.length > 0 && (
        <div
          data-slot="dialog-body"
          className={cn(BODY_CLASS, header.length === 0 && "mt-6")}
        >
          {rest}
        </div>
      )}
      {footer}
    </>
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  size = "lg",
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
  size?: keyof typeof dialogSizes
}) {
  /*
   * The popup itself never scrolls — the header and footer stay put and only
   * what sits between them does, so the scrollbar belongs to the body box
   * rather than to the whole dialog. Call sites pass their body as plain
   * children, so the split happens here instead of asking all ~53 of them to
   * wrap it. Roughly half of them nest the footer inside a <form>, so that one
   * wrapper is looked through and turned into the flex column instead.
   */
  const layout = splitDialogSlots(children)

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-size={size}
        className={cn(
          // `max-h` keeps a long dialog off the top and bottom edges of the
          // viewport; the body below is what actually scrolls.
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100svh-4rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          dialogSizes[size],
          className
        )}
        {...props}
      >
        {layout}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        // `min-h-5` keeps the row at least as tall as the close button so the
        // body — and its scrollbar — start below it; `pr-9` keeps the title
        // clear of it. `sticky` only bites when a child component nests the
        // header inside the scrolling body.
        "sticky top-0 z-10 flex min-h-5 shrink-0 flex-col gap-2 bg-popover pr-9",
        className
      )}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        // Pinned to the bottom whether it sits beside the scrolling body or
        // (when a child component owns it) inside it. `bg-popover` has to be
        // opaque for the sticky case, and there are deliberately no negative
        // margins: the body box clips horizontally, which would shear a
        // full-bleed footer's edges off.
        "sticky bottom-0 z-10 flex shrink-0 flex-col-reverse gap-2 border-t bg-popover pt-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
