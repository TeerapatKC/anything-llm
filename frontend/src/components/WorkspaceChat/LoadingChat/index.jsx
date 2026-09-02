import { useTranslation } from "react-i18next";

/**
 * lucide's `messages-square`, inlined as a data-URI so it can be used as a CSS
 * mask - the `.shimmer-mask` sweep needs a mask source, which a React icon
 * component cannot provide. Stroked in solid black because the mask reads the
 * SVG's alpha and discards everything transparent; the colour never shows.
 *
 * Kept at lucide's 24x24 grid and geometry so it sits in the same icon family as
 * the rest of the app.
 */
const ICON_MASK = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'/%3E%3Cpath d='M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1'/%3E%3C/svg%3E")`;

/**
 * Placeholder for the transcript while the workspace and its history load.
 *
 * A single mark in the centre rather than skeleton bars: the bars implied a
 * shape for a conversation nobody has seen yet, and guessed wrong every time -
 * the real transcript is never three turns of those widths. One quiet mark
 * makes no claim about what is arriving.
 *
 * The label carries the accessible name, so the container needs no `aria-label`
 * of its own - the mark is a masked div with no semantics to hide.
 */
export default function LoadingChat() {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-busy="true"
      className="transition-all duration-500 relative bg-theme-bg-secondary w-full h-full flex flex-col items-center justify-center gap-y-4"
    >
      {/*
        The tile is the gap between consecutive sweeps, so the default 13rem
        leaves a mark this small unlit for most of the cycle. Halving the tile
        and the duration together doubles how often the light arrives while
        holding the travel speed at the same px/s as every other shimmer in the
        app - the two are only coherent when they change in step.
      */}
      <div
        className="shimmer-mask size-14"
        style={{
          "--shimmer-mask": ICON_MASK,
          "--shimmer-tile": "6.5rem",
          animationDuration: "0.95s",
        }}
      />
      <span className="text-shimmer font-mono text-sm">
        {t("common.loading")}
      </span>
    </div>
  );
}
