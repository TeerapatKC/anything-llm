import * as DialogPrimitive from "@radix-ui/react-dialog";

/**
 * @typedef {Object} ModalWrapperProps
 * @property {import("react").ReactComponentElement} children - The DOM/JSX to render
 * @property {boolean} isOpen - Option that renders the modal
 * @property {boolean} noPortal - (default: false) Used for creating sub-DOM modals that need to be rendered as a child element instead of a modal placed at the root
 * Note: This can impact the bg-overlay presentation due to conflicting DOM positions so if using this property you should
   double check it renders as desired.
 * @property {() => void} [onClose] - (optional) When provided, Escape and clicking the
 * backdrop dismiss the modal. Omitting it keeps the pre-Radix behaviour where the modal
 * can only be dismissed by its own controls.
 * @property {boolean} [modal] - (default: false) Enables Radix's focus trap, body scroll
 * lock and outside-pointer blocking. Left off by default so this stays a drop-in
 * replacement for the previous plain-div implementation; opt in per call site once the
 * modal's contents are known to work inside a focus trap.
 * @property {string} [title] - (optional) Accessible name for the dialog. Rendered
 * visually hidden, so it never changes the layout. Radix warns in the console when a
 * Dialog has no title, hence the generic fallback.
 */

const OVERLAY_CLASSES =
  "bg-black/60 backdrop-blur-sm fixed top-0 left-0 outline-none w-screen h-screen flex items-center justify-center z-99";

/**
 *
 * @param {ModalWrapperProps} props - ModalWrapperProps to pass
 * @returns {import("react").ReactNode}
 */
export default function ModalWrapper({
  children,
  isOpen,
  noPortal = false,
  onClose = null,
  modal = false,
  title = "Dialog",
}) {
  if (!isOpen) return null;

  // Radix only reports "closed" through onOpenChange. Callers that did not pass an
  // onClose keep the old behaviour: Escape and backdrop clicks are swallowed.
  const dismissible = typeof onClose === "function";
  const swallow = (event) => {
    if (!dismissible) event.preventDefault();
  };

  const content = (
    <DialogPrimitive.Content
      className={OVERLAY_CLASSES}
      onEscapeKeyDown={swallow}
      onPointerDownOutside={swallow}
      onInteractOutside={swallow}
      // Children own their focus behaviour; auto-focusing the first control would
      // change where the caret lands in the ~47 existing modals.
      onOpenAutoFocus={(event) => event.preventDefault()}
      aria-describedby={undefined}
    >
      <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
      {children}
    </DialogPrimitive.Content>
  );

  return (
    <DialogPrimitive.Root
      open={isOpen}
      modal={modal}
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
    >
      {noPortal ? (
        content
      ) : (
        // Matches the previous createPortal target so stacking context is unchanged.
        <DialogPrimitive.Portal container={document.getElementById("root")}>
          {content}
        </DialogPrimitive.Portal>
      )}
    </DialogPrimitive.Root>
  );
}
