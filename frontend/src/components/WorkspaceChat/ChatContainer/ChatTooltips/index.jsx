import { Tooltip } from "react-tooltip";

/**
 * The last two react-tooltip definitions in the chat container.
 *
 * This used to hold every chat tooltip, because react-tooltip attaches a
 * body-level event listener per instance and rendering one on each message
 * would add hundreds of them. Radix attaches listeners to its own trigger
 * instead, so the rest now live inline at their anchors and that constraint is
 * gone.
 *
 * What remains belongs to AttachItem, which uses react-tooltip as an
 * interactive popover — clickable, holding the ParsedFilesMenu panel, and
 * driven imperatively through a ref. That is a Radix Popover rather than a
 * Tooltip, so converting it is a redesign and is left for its own change.
 * ParsedFilesMenu's own anchor is spread from an object literal, so it is still
 * id-matched too.
 */
export function ChatTooltips() {
  return (
    <>
      <Tooltip
        id="context-window-limit-exceeded"
        place="top"
        delayShow={500}
        className="tooltip !text-xs max-w-[350px]"
      />
      <Tooltip
        id="attach-item-btn"
        place="top"
        delayShow={300}
        className="tooltip !text-xs"
      />
    </>
  );
}
