import { cn } from "@/lib/utils"

/**
 * App addition on top of the stock shadcn skeleton.
 *
 * The 34 call sites in this app came from `react-loading-skeleton` and pass
 * that library's props (`count`, `width`, `height`, `baseColor`,
 * `highlightColor`, `containerClassName`, `enableAnimation`), so the stock
 * `<div className>`-only component is widened to accept them. The sweeping
 * highlight is reproduced from that library's stylesheet via the
 * `skeleton-sweep` keyframes in src/index.css rather than shadcn's
 * `animate-pulse`, so the loading states look the way they did.
 */
type SkeletonProps = Omit<React.ComponentProps<"span">, "width" | "height"> & {
  containerClassName?: string
  count?: number
  width?: string | number
  height?: string | number
  baseColor?: string
  highlightColor?: string
  enableAnimation?: boolean
}

const size = (v?: string | number) => (typeof v === "number" ? `${v}px` : v)

function Skeleton({
  className,
  containerClassName,
  count = 1,
  width,
  height,
  baseColor,
  highlightColor,
  enableAnimation = true,
  style,
  ...props
}: SkeletonProps) {
  const vars = {
    "--skeleton-base": baseColor ?? "var(--theme-bg-secondary)",
    "--skeleton-highlight": highlightColor ?? "var(--theme-bg-primary)",
  } as React.CSSProperties

  const items = Array.from({ length: Math.max(1, count) }, (_, i) => (
    <span
      key={i}
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "relative block w-full select-none overflow-hidden rounded bg-[color:var(--skeleton-base)] leading-none",
        enableAnimation &&
          "after:absolute after:inset-0 after:-translate-x-full after:bg-[linear-gradient(90deg,var(--skeleton-base),var(--skeleton-highlight),var(--skeleton-base))] after:bg-no-repeat after:content-[''] after:animate-skeleton-sweep motion-reduce:after:hidden",
        className
      )}
      style={{
        ...vars,
        width: size(width),
        height: size(height),
        ...style,
      }}
      {...props}
    />
  ))

  if (count === 1 && !containerClassName) return items[0]
  return <span className={cn("block", containerClassName)}>{items}</span>
}

export { Skeleton }
