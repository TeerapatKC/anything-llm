import { useBlocker } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ABORT_STREAM_EVENT } from "@/utils/chat";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Guards against accidentally leaving a chat while a response is actively
 * generating (eg: the Stop button is showing). Internal route changes are
 * intercepted via react-router's `useBlocker` and confirmed through a dialog.
 * Closing/refreshing the app entirely is intentionally not guarded - only
 * in-app navigation. All navigation must go through the router (`navigate`/
 * `<Link>`) for this guard to intercept it - `window.location` bypasses it.
 *
 * The guard is non-blocking: the stream keeps flowing in the background while
 * the dialog is open. Generation is only aborted if the user confirms leaving.
 *
 * @note `useBlocker` constraints - do not lose these as this evolves:
 * - It requires a data router (`createBrowserRouter`/`createHashRouter`) and
 *   will THROW at mount inside a plain `<BrowserRouter>`/`<HashRouter>`. See
 *   main.jsx. The desktop app must use `createHashRouter` for this to work.
 * - React-router supports only ONE active blocker at a time app-wide. This is
 *   currently safe because a single ChatContainer mounts this guard - if
 *   another `useBlocker` is ever added elsewhere (eg: unsaved-form guards),
 *   they will silently conflict when co-mounted.
 * - It only intercepts router-driven navigation (`navigate`/`<Link>`),
 *   including browser back/forward. `window.location.*` navigations and
 *   reloads bypass it entirely - reloads killing generation is accepted
 *   behavior, but new in-app navigation must go through the router.
 * - The `shouldBlock` callback compares pathnames, so same-path query/hash
 *   changes are deliberately not blocked.
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isGenerating - Whether a response is actively generating (mirrors the Send/Stop button state)
 */
export default function ActiveGenerationGuard({ isGenerating = false }) {
  const { t } = useTranslation();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isGenerating && currentLocation.pathname !== nextLocation.pathname
  );

  // The dialog stays open even if the response finishes while it is showing -
  // auto-resuming the navigation underneath the user is jarring. They decide
  // via Cancel/Continue either way, so only emit the abort if a response is
  // actually still generating.
  function stopGenerationAndLeave() {
    if (isGenerating) window.dispatchEvent(new CustomEvent(ABORT_STREAM_EVENT));
    blocker.proceed();
  }

  if (blocker.state !== "blocked") return null;
  return (
    <Dialog open={true} onOpenChange={(open) => !open && blocker.reset()}>
      <DialogContent size="sm">
        <div className="p-6 flex flex-col gap-y-4">
          <DialogHeader>
            <DialogTitle>{t("chat_window.leave_generating.title")}</DialogTitle>
            <DialogDescription className="text-theme-text-secondary mt-1">
              {t("chat_window.leave_generating.description")}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-row justify-end gap-x-2">
            <Button variant="outline" onClick={blocker.reset}>
              {t("chat_window.leave_generating.cancel")}
            </Button>
            <Button variant="default" onClick={stopGenerationAndLeave}>
              {t("chat_window.leave_generating.confirm")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
