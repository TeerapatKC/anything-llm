import { useTranslation } from "react-i18next";
import truncate from "truncate";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { combineLikeSources } from "../../ChatHistory/Citation";
import SourceDetailView from "./SourceDetailView";
import SourceItem from "../SourceItem";

export default function MobileCitationModal({
  sources: rawSources,
  isOpen,
  selectedSource,
  setSelectedSource,
  onClose,
}) {
  const sources = combineLikeSources(rawSources);
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[calc(100%-40px)] max-h-[70vh] rounded-[16px] bg-zinc-800 light:bg-white light:border-2 light:border-slate-300 flex flex-col gap-4">
        {selectedSource ? (
          <>
            <DialogTitle className="sr-only">
              {truncate(selectedSource.title || "Source", 30)}
            </DialogTitle>
            <SourceDetailView
              source={selectedSource}
              onBack={() => setSelectedSource(null)}
            />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-semibold text-theme-text-primary light:text-slate-900">
                {t("chat_window.sources")}
              </DialogTitle>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto no-scroll">
              {sources.map((source, idx) => (
                <SourceItem
                  key={source.title || idx}
                  source={source}
                  onClick={() => setSelectedSource(source)}
                />
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
