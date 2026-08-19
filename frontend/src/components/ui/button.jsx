import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Shared by the stock shadcn/ui variants only. The app variants below are the
 * exact class strings their call sites already used, so they must not inherit
 * a base that would change their radius, focus ring or icon sizing.
 */
const SHADCN_BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

/**
 * Variants named after what the button is for in this app. Each one is lifted
 * verbatim from a class string that was repeated across the codebase, so
 * adopting it is a de-duplication rather than a restyle. `size` does not apply
 * to them — their padding and height are part of the variant.
 */
export const APP_VARIANTS = [
  "cta",
  "muted",
  "modalClose",
  "inline",
  "chip",
  "homePrimary",
  "danger",
  "menuItem",
];

const buttonVariants = cva("", {
  variants: {
    variant: {
      // --- stock shadcn/ui ---
      default: `${SHADCN_BASE} bg-primary text-primary-foreground hover:bg-primary/90`,
      destructive: `${SHADCN_BASE} bg-destructive text-destructive-foreground hover:bg-destructive/90`,
      // `text-foreground` is explicit rather than inherited: this app's body
      // sets no `color`, so an outline button rendered anywhere that doesn't
      // set one itself falls back to black and vanishes on a dark surface.
      outline: `${SHADCN_BASE} border border-input bg-background text-foreground hover:bg-primary/10 hover:text-foreground`,
      secondary: `${SHADCN_BASE} bg-secondary text-secondary-foreground hover:bg-secondary/80`,
      ghost: `${SHADCN_BASE} hover:bg-accent hover:text-accent-foreground`,
      link: `${SHADCN_BASE} text-primary underline-offset-4 hover:underline`,

      // --- this app ---
      /** Solid light button used for the primary action in modals and forms. */
      cta: "transition-all duration-300 bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm",
      /** The quieter partner to `cta`, typically Cancel. */
      muted:
        "transition-all duration-300 text-theme-text-primary hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm",
      /** The X in the top-right corner of a modal. Positions itself. */
      modalClose:
        "absolute top-4 right-4 transition-all duration-300 bg-transparent rounded-lg text-sm p-1 inline-flex items-center hover:bg-theme-modal-border hover:border-theme-modal-border hover:border-opacity-50 border-transparent border",
      /** Text-only button that sits inline with copy, e.g. "Show advanced". */
      inline:
        "border-none text-theme-text-primary hover:text-theme-text-secondary flex items-center text-sm",
      /** Small accented pill, e.g. Auto-Detect next to an input. */
      chip: "border-none bg-primary-button text-xs font-medium px-2 py-1 rounded-lg hover:bg-secondary hover:text-white shadow-[0_4px_14px_rgba(0,0,0,0.25)]",
      /** Full-width primary action on the home screen and its cards. */
      homePrimary:
        "mt-2 w-full justify-center border-none px-4 py-2 rounded-lg text-dark-text light:text-white text-sm font-bold items-center flex gap-x-2 bg-theme-home-button-primary hover:bg-theme-home-button-primary-hover disabled:bg-theme-home-button-primary-hover disabled:cursor-not-allowed",
      /** Destructive text button, e.g. Delete on a list row. */
      danger:
        "text-xs font-medium text-white/80 light:text-black/80 hover:light:text-red-500 hover:text-red-300 rounded-lg px-2 py-1 hover:bg-white hover:light:bg-red-50 hover:bg-opacity-10",
      /** Row inside a popover or action menu. */
      menuItem:
        "border-none flex items-center rounded-lg gap-x-2 hover:bg-theme-action-menu-item-hover py-1.5 px-2 transition-colors duration-200 w-full text-left",
    },
    size: {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    // App variants carry their own sizing; letting `size` default on would add
    // h-10/px-4/py-2 on top and change their geometry.
    const resolvedSize = APP_VARIANTS.includes(variant) ? null : size;
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size: resolvedSize, className })
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
