import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import showToast from "../../../../../utils/toast";
import FileUploadProgress from "./FileUploadProgress";
import Workspace from "../../../../../models/workspace";
import debounce from "lodash.debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Fills in a missing protocol so the user can type "example.com/docs" instead
 * of the full URL. Anything already carrying a scheme is left alone.
 * @param {string} value raw input value
 * @returns {string|null} the URL to scrape, or null if it cannot be one
 */
function withProtocol(value = "") {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    new URL(candidate);
    return candidate;
  } catch {
    return null;
  }
}

/**
 * Everything about uploading that is not the drop target itself: the progress
 * list for in-flight uploads, and link scraping.
 *
 * Files are chosen in the document panel above - it is the drop target and it
 * owns the upload button - so this renders nothing but the link form until an
 * upload is actually running.
 *
 * @param {object} props
 * @param {ReturnType<import("../hooks/useUploadQueue").default>} props.queue
 * the upload queue shared with the picker's drop targets, so every upload -
 * panel drop, folder-row drop or button pick - reports into this one list.
 * @param {() => Promise<void>} props.onUploadComplete called (coalesced) once a
 * burst of file uploads settles, so the picker can hydrate in place.
 * @param {() => Promise<void>} props.onLinkScraped called after a link scrape.
 */
export default function UploadFile({
  workspace,
  queue,
  onUploadComplete,
  onLinkScraped,
}) {
  const { t } = useTranslation();
  const { ready, files, setFiles } = queue;
  const [fetchingUrl, setFetchingUrl] = useState(false);

  const handleSendLink = async (e) => {
    e.preventDefault();
    const formEl = e.target;
    const form = new FormData(formEl);
    const link = withProtocol(form.get("link"));
    if (!link) return showToast("Please enter a valid link", "error");

    setFetchingUrl(true);
    const { response, data } = await Workspace.uploadLink(workspace.slug, link);
    if (!response.ok) {
      showToast(`Error uploading link: ${data.error}`, "error");
    } else {
      await onLinkScraped();
      showToast("Link uploaded successfully", "success");
      formEl.reset();
    }
    setFetchingUrl(false);
  };

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
      <div className="text-center/50 text-theme-text-primary text-xs font-medium w-full py-2">
        {t("connectors.upload.or-submit-link")}
      </div>
      <form onSubmit={handleSendLink} className="flex gap-x-2">
        <Input
          disabled={fetchingUrl}
          name="link"
          // Not type="url" - that would force the user to type the protocol.
          type="text"
          inputMode="url"
          className="w-3/4"
          placeholder={t("connectors.upload.placeholder-link")}
          autoComplete="off"
        />
        <Button
          type="submit"
          variant="outline"
          disabled={fetchingUrl}
          className="w-auto"
        >
          {fetchingUrl
            ? t("connectors.upload.fetching")
            : t("connectors.upload.fetch-website")}
        </Button>
      </form>
      <div className="mt-6 text-center/80 text-theme-text-primary text-xs font-medium w-full">
        {t("connectors.upload.privacy-notice")}
      </div>
    </div>
  );
}
