import { cva, type VariantProps } from "class-variance-authority"
import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * App addition on top of the stock shadcn spinner: the ~60 call sites in this
 * app were written against a `size` scale, so it is kept here. Sizes are
 * literal classes on purpose — the `PreLoader` this supersedes built them as
 * `h-${size} w-${size}`, which Tailwind's scanner cannot see.
 */
const spinnerVariants = cva("animate-spin", {
  variants: {
    size: {
      xs: "size-3",
      sm: "size-4",
      md: "size-6",
      lg: "size-8",
      xl: "size-16",
    },
  },
  defaultVariants: {
    size: "md",
  },
})

function Spinner({
  className,
  size,
  ...props
}: React.ComponentProps<"svg"> & VariantProps<typeof spinnerVariants>) {
  return (
    <Loader2Icon
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn(spinnerVariants({ size }), className)}
      {...props}
    />
  )
}

/**
 * App addition. Centres a Spinner in whatever box it is given, replacing the
 * `w-full h-full flex justify-center items-center` wrapper that every loading
 * branch in the settings pages hand-rolled around its spinner.
 */
function SpinnerBlock({
  className,
  size = "xl",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof spinnerVariants>) {
  return (
    <div
      className={cn(
        "flex w-full flex-1 items-center justify-center py-10 text-primary",
        className
      )}
      {...props}
    >
      <Spinner size={size} />
    </div>
  )
}

export { Spinner, SpinnerBlock, spinnerVariants }
