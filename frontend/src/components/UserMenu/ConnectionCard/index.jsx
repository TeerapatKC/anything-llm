import { useTranslation } from "react-i18next";

/**
 * The shell every messaging connection is drawn in - Telegram, LINE, and
 * whatever comes next.
 *
 * Shared so that a platform nobody has set up yet still reads as a platform:
 * before this, an unconfigured one collapsed to a bare grey sentence while a
 * configured one got a full card, and the dialog looked broken rather than
 * empty.
 */
export default function ConnectionCard({
  icon,
  accentClassName,
  title,
  description,
  status = "disconnected",
  children,
}) {
  const dormant = status !== "connected";

  return (
    <div className="overflow-hidden rounded-xl border border-theme-modal-border">
      <div className="flex items-center gap-x-3 border-b border-theme-modal-border bg-theme-bg-primary px-4 py-3">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-full ${accentClassName} ${
            // An unset platform keeps its mark but not its shout.
            status === "unavailable" ? "opacity-40 grayscale" : ""
          }`}
        >
          {icon}
        </span>
        <div className="flex min-w-0 flex-col">
          <span
            className={`text-sm font-semibold ${dormant ? "text-theme-text-primary" : "text-theme-text-primary"}`}
          >
            {title}
          </span>
          {!!description && (
            <span className="truncate text-xs text-theme-text-secondary">
              {description}
            </span>
          )}
        </div>
        <ConnectionStatusPill status={status} />
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/**
 * Says in a word what the card's buttons only imply: linked, ready to link, or
 * not available on this instance at all.
 */
export function ConnectionStatusPill({ status }) {
  const { t } = useTranslation();
  const styles = {
    connected: "bg-green-500/15 text-green-400 light:text-green-600",
    disconnected: "bg-theme-bg-primary text-theme-text-secondary",
    unavailable: "bg-theme-bg-primary text-theme-text-secondary/70",
  };

  return (
    <span
      className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${styles[status] || styles.disconnected}`}
    >
      {t(`profile_settings.connections.status_${status}`)}
    </span>
  );
}

/**
 * The body of a card for a platform this instance has not set up.
 * @param {{message: string}} props
 */
export function ConnectionUnavailable({ message }) {
  return <p className="text-xs text-theme-text-secondary">{message}</p>;
}
