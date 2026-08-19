import { cn } from "@/lib/utils";

/**
 * Title block at the top of a settings page.
 *
 * Consolidates 32 copies that had drifted apart: the title was `text-theme-text-primary` on
 * 13 of them and `text-theme-text-primary` on 19 (the former only looked right
 * in light mode because of a global `[data-theme="light"] .text-white`
 * override), the description sometimes carried `mt-2` and sometimes not, and
 * Branding used a third border recipe.
 *
 * Two deliberate changes from what it replaces:
 *  - the title is an `<h1>`, not a `<p>`, so the page has a real heading;
 *  - the primary action goes in `actions` rather than below the header with a
 *    negative bottom margin (`md:-mb-6`, `-mb-12`, `-mb-14` were all in use)
 *    dragging it back up over the content.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.description]
 * @param {React.ReactNode} [props.actions] Trailing controls, right-aligned.
 * @param {React.ReactNode} [props.children] Extra rows below the title block.
 * @param {string} [props.className]
 */
export default function PageHeader({
  title,
  description,
  actions,
  children,
  className,
}) {
  return (
    <div
      className={cn(
        "w-full flex flex-col gap-y-3 border-b border-theme-sidebar-border pb-6",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-col gap-y-2">
          <h1 className="text-lg leading-6 font-bold text-theme-text-primary">
            {title}
          </h1>
          {description ? (
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-x-2">{actions}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
