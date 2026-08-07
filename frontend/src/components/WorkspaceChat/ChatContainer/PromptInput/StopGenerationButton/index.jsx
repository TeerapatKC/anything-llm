import { ABORT_STREAM_EVENT } from "@/utils/chat";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

export default function StopGenerationButton() {
  const { t } = useTranslation();
  function emitHaltEvent() {
    window.dispatchEvent(new CustomEvent(ABORT_STREAM_EVENT));
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={emitHaltEvent}
            className="border-none inline-flex justify-center items-center rounded-full cursor-pointer w-8 h-8 bg-white light:bg-slate-800 hover:opacity-80 transition-opacity"
            aria-label="Stop generating"
          >
            <div className="w-3.5 h-3.5 rounded-[4px] bg-zinc-800 light:bg-white" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px] text-xs">
          {t("chat_window.stop_generating")}
        </TooltipContent>
      </Tooltip>
    </>
  );
}
