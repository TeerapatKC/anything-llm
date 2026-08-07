import { cn } from "@/lib/utils";

/**
 * @typedef {Object} SkeletonProps
 * @property {string} [className] - Classes for each placeholder element.
 * @property {string} [containerClassName] - Classes for the wrapper around them.
 * @property {number} [count] - How many placeholders to render. Defaults to 1.
 * @property {string|number} [width] - CSS width; bare numbers are treated as px.
 * @property {string|number} [height] - CSS height; bare numbers are treated as px.
 * @property {string} [baseColor] - Resting colour. Defaults to --theme-bg-secondary.
 * @property {string} [highlightColor] - Colour of the travelling highlight.
 * @property {boolean} [enableAnimation] - Set false for a static placeholder.
 */

const size = (v) => (typeof v === "number" ? `${v}px` : v);

/**
 * Loading placeholder.
 *
 * This is the stock shadcn/ui Skeleton widened to the prop API the app already
 * used, so the ~30 call sites that came from react-loading-skeleton keep their
 * sizing and colours. The sweeping highlight is reproduced from that library's
 * stylesheet rather than using shadcn's `animate-pulse`, so the loading states
 * still look the way they did.
 */
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
}) {
  const vars = {
    "--skeleton-base": baseColor ?? "var(--theme-bg-secondary)",
    "--skeleton-highlight": highlightColor ?? "var(--theme-bg-primary)",
  };

  const items = Array.from({ length: Math.max(1, count) }, (_, i) => (
    <span
      key={i}
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
  ));

  if (count === 1 && !containerClassName) return items[0];
  return <span className={cn("block", containerClassName)}>{items}</span>;
}

export { Skeleton };
