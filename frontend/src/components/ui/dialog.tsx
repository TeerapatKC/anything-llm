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
 * its max height — that is the whole trick that hands it the scrollbar.
 * `thin-scrollbar` is the app's shared slim bar (6px, translucent thumb, no
 * track) so a dialog scrolls the same way every other surface does instead of
 * showing the platform's default chunky bar. `pr-2` keeps text off it.
 */
const BODY_CLASS =
  // `-mx-1 pl-1 pr-3 py-1` reserves room for the 3px focus ring that inputs
  // draw *outside* their border — `overflow-x-hidden` would otherwise shear it
  // off at the box edge. The negative margin cancels the inset again, so the
  // content still lines up with the header and footer.
  "thin-scrollbar -mx-1 flex min-h-0 flex-col gap-4 overflow-x-hidden overflow-y-auto py-1 pl-1 pr-3"

/**
 * The header and footer are positioned against the popup instead of living in
 * the scroll flow, which is what keeps the scrollbar clear of them. They are
 * measured at runtime rather than split out of `children`, because 21 dialogs
 * render a whole child component that owns its own header and footer
 * (`<DialogContent><NewUserModal/></DialogContent>`) — a parent cannot see
 * inside a component, so measuring the rendered DOM is the only approach that
 * works for every shape.
 */
function useSlotInsets(body: HTMLElement | null) {
  const [insets, setInsets] = React.useState({ top: 0, bottom: 0 })

  React.useLayoutEffect(() => {
    // Measured off the body element, which arrives through a callback ref:
    // Base UI mounts the popup lazily, so a plain `useRef` is still null when
    // the first layout effect runs and would never be re-checked. (A ref on
    // `Popup` itself is no good either — it takes ref as a plain prop, which
    // React 18 drops.)
    const popup = body?.parentElement
    if (!popup) return

    // 12 + the box's own `py-1` keeps the visual gap at the popup's 16px rhythm
    const GAP = 12
    const measure = () => {
      const header = popup.querySelector<HTMLElement>('[data-slot="dialog-header"]')
      const footer = popup.querySelector<HTMLElement>('[data-slot="dialog-footer"]')
      setInsets((prev) => {
        const next = {
          top: header ? header.offsetHeight + GAP : 0,
          bottom: footer ? footer.offsetHeight + GAP : 0,
        }
        return prev.top === next.top && prev.bottom === next.bottom ? prev : next
      })
    }

    measure()
    // Slots resize (an error message appears, a title wraps) and appear or
    // disappear (a dialog swaps its footer once a form succeeds).
    const resize = new ResizeObserver(measure)
    const track = () => {
      resize.disconnect()
      popup
        .querySelectorAll('[data-slot="dialog-header"],[data-slot="dialog-footer"]')
        .forEach((node) => resize.observe(node))
      measure()
    }
    track()
    const mutation = new MutationObserver(track)
    mutation.observe(popup, { childList: true, subtree: true })
    return () => {
      resize.disconnect()
      mutation.disconnect()
    }
  }, [body])

  return insets
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
  const [body, setBody] = React.useState<HTMLDivElement | null>(null)
  const insets = useSlotInsets(body)

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-size={size}
        className={cn(
          // `max-h` keeps a long dialog off the top and bottom edges of the
          // viewport; the body below is what actually scrolls.
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100svh-4rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          dialogSizes[size],
          className
        )}
        {...props}
      >
        <div
          ref={setBody}
          data-slot="dialog-body"
          className={BODY_CLASS}
          // The scroll box stops short of the positioned header and footer, so
          // the scrollbar covers only the part that actually scrolls.
          style={{ marginTop: insets.top, marginBottom: insets.bottom }}
        >
          {children}
        </div>
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2 z-30"
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
        // Positioned against the popup rather than left in the scroll flow, so
        // the scrollbar starts *below* it instead of running up beside the
        // close button. `DialogContent` measures this and insets the scroll
        // box by the same amount. `pr-9` keeps the title clear of the ✕.
        "absolute top-4 right-4 left-4 z-20 flex flex-col gap-2 bg-popover pr-9",
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
        // Same treatment as the header at the other end: out of the scroll
        // flow, so the scrollbar stops above it and it can never move.
        "absolute right-4 bottom-4 left-4 z-20 flex flex-col-reverse gap-2 border-t bg-popover pt-4 sm:flex-row sm:justify-end",
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
