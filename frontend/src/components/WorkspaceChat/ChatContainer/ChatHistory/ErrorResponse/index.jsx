import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, TriangleAlert } from "lucide-react";

/**
 * Renders a failed response like the compact Thinking disclosure instead of a
 * visually heavy message card. The technical detail stays available on demand.
 */
export default function ErrorResponse({ error }) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const detail = String(error || "Unknown error");

  // role="alert" rather than "status": a failed reply is the one case where the
  // user needs interrupting, because nothing else on the page changes to tell
  // them the turn ended.
  return (
    <div className="flex w-full justify-center px-4 md:pl-0" role="alert">
      <div className="flex w-full flex-col">
        <button
          type="button"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          aria-expanded={isExpanded}
          className="flex w-full cursor-pointer items-center gap-x-2.5 py-2 text-left"
        >
          <TriangleAlert
            className="size-[18px] shrink-0 text-red-500/70"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 font-mono text-sm leading-[18px] text-red-500/80">
            {t("chat_window.response_failed")}
          </span>
          <ChevronDown
            className={`size-4 shrink-0 transform text-red-500/60 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>

        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="pb-2 pl-7 font-mono text-sm leading-5 text-red-500/70">
              {detail}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
