import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import FileUploadProgress from "./FileUploadProgress";
import debounce from "lodash.debounce";

/**
 * Everything about uploading that is not the drop target itself: the progress
 * list for in-flight uploads.
 *
 * Files are chosen in the document panel above - it is the drop target and it
 * owns the upload button - so this renders only progress and the privacy notice.
 *
 * @param {object} props
 * @param {ReturnType<import("../hooks/useUploadQueue").default>} props.queue
 * the upload queue shared with the picker's drop targets, so every upload -
 * panel drop, folder-row drop or button pick - reports into this one list.
 * @param {() => Promise<void>} props.onUploadComplete called (coalesced) once a
 * burst of file uploads settles, so the picker can hydrate in place.
 */
export default function UploadFile({ workspace, queue, onUploadComplete }) {
  const { t } = useTranslation();
  const { ready, files, setFiles } = queue;

  // Uploads finish one at a time; coalesce their completions into a single
  // picker sync so a 50-file folder drop does not fire 50 refreshes.
  const syncPicker = useMemo(
    () => debounce(() => onUploadComplete?.(), 750),
    [onUploadComplete]
  );
  useEffect(() => () => syncPicker.cancel(), [syncPicker]);

  return (
    <div className="w-full">
      {ready === false && (
        <div className="flex items-start gap-x-2 rounded-lg border border-theme-modal-border bg-theme-bg-primary p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-theme-text-primary/80" />
          <div>
            <div className="text-theme-text-primary/80 text-sm font-semibold">
              {t("connectors.upload.processor-offline")}
            </div>
            <div className="text-theme-text-primary/60 text-xs font-medium">
              {t("connectors.upload.processor-offline-desc")}
            </div>
          </div>
        </div>
      )}
      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-2 overflow-auto max-h-[180px] rounded-lg border border-theme-modal-border bg-theme-bg-primary p-2 overflow-y-scroll no-scroll">
          {files.map((file) => (
            <FileUploadProgress
              key={file.uid}
              file={file.file}
              uuid={file.uid}
              setFiles={setFiles}
              slug={workspace.slug}
              rejected={file?.rejected}
              reason={file?.reason}
              folderName={file?.folderName}
              relativePath={file?.relativePath}
              onSettled={syncPicker}
            />
          ))}
        </div>
      )}
      <div className="mt-6 text-center/80 text-theme-text-primary text-xs font-medium w-full">
        {t("connectors.upload.privacy-notice")}
      </div>
    </div>
  );
}
