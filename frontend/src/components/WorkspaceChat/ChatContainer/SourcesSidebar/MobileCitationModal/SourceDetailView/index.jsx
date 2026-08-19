import { Fragment } from "react";
import { ChevronLeft, Info } from "lucide-react";
import { decode as HTMLDecode } from "he";
import truncate from "truncate";
import { useTranslation } from "react-i18next";
import { omitChunkHeader } from "../../../ChatHistory/Citation";
import { toPercentString } from "@/utils/numbers";

export default function SourceDetailView({ source, onBack }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex items-center justify-between pr-8">
        <button
          onClick={onBack}
          type="button"
          className="text-theme-text-secondary light:text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <p className="font-semibold text-base leading-6 text-theme-text-primary light:text-slate-900 truncate px-2">
          {truncate(source.title, 30)}
        </p>
      </div>
      <div className="flex flex-col overflow-y-auto no-scroll">
        {source.chunks.map(({ text, score }, idx) => (
          <Fragment key={idx}>
            <div className="flex flex-col gap-y-1 py-4">
              <p className="text-sm leading-[20px] text-theme-text-primary light:text-slate-900">
                {HTMLDecode(omitChunkHeader(text))}
              </p>
              {!!score && (
                <div className="flex items-center text-xs text-theme-text-secondary light:text-slate-500 gap-x-1">
                  <Info size={14} />
                  <p>
                    {toPercentString(score)} {t("chat_window.similarity_match")}
                  </p>
                </div>
              )}
            </div>
            {idx !== source.chunks.length - 1 && (
              <hr className="border-zinc-700 light:border-slate-300" />
            )}
          </Fragment>
        ))}
      </div>
    </>
  );
}
