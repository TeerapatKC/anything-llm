import SettingsSidebar from "@/components/SettingsSidebar";
import { cn } from "@/lib/utils";

/**
 * Root shell for every settings-style screen: the fixed sidebar plus whatever
 * pane the page wants beside it.
 *
 * Exported separately from `SettingsLayout` because two screens (Agents,
 * Experimental Features) render their own split pane instead of the scrolling
 * document below, and previously duplicated this outer div to do it.
 */
export function AppShell({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "w-screen h-screen overflow-hidden bg-theme-bg-container flex",
        className
      )}
      {...props}
    >
      <SettingsSidebar />
      {children}
    </div>
  );
}

/**
 * Sidebar plus a two-pane body — a list of items on the left, the selected
 * item's settings on the right. Agents, Experimental Features and Chat Embed
 * Widgets each had a byte-identical copy of this.
 */
export function SplitLayout({ className, children, ...props }) {
  return (
    <AppShell className={cn("mt-6 min-[1100px]:mt-0", className)} {...props}>
      <div
        style={{ height: "100%" }}
        className="relative min-w-0 w-full h-full flex"
      >
        {children}
      </div>
    </AppShell>
  );
}

/**
 * Sidebar plus the scrolling content pane, with no content column inside it.
 *
 * For the few screens whose children bring their own column — Audio
 * Preference stacks two provider sections that each render one, and the
 * Community Hub import flow paints its own background.
 */
export function PaneLayout({
  children,
  paneClassName,
  shellClassName,
  ...props
}) {
  return (
    <AppShell className={shellClassName} {...props}>
      <div
        style={{ height: "100%" }}
        className={cn(
          "relative min-w-0 bg-theme-bg-secondary w-full h-full overflow-y-scroll thin-scrollbar p-4 min-[1100px]:p-0",
          paneClassName
        )}
      >
        {children}
      </div>
    </AppShell>
  );
}

/**
 * The standard settings page: sidebar, scrolling content pane, one column of
 * content on a shared rhythm.
 *
 * This replaces 32 hand-copied shells. Those had drifted into four different
 * right paddings (`md:pr-[50px]`, `md:pr-[86px]`, and two py orderings); the
 * single value here is deliberate — the asymmetric right padding existed only
 * to clear the scrollbar, which `p-4 md:p-0` on the scroll pane already does.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className] Extra classes for the content column.
 * @param {string} [props.paneClassName] Extra classes for the scrolling pane.
 * @param {string} [props.shellClassName] Extra classes for the outer shell.
 */
export default function SettingsLayout({ children, className, ...props }) {
  return (
    <PaneLayout {...props}>
      <div
        className={cn(
          "flex flex-col w-full px-1 py-16 min-[1100px]:px-6 min-[1100px]:py-6",
          className
        )}
      >
        {children}
      </div>
    </PaneLayout>
  );
}
