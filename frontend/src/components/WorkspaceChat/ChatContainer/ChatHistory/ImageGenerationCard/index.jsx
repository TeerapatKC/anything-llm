import { memo, useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { saveAs } from "file-saver";
import {
  Check,
  Copy,
  Download,
  Ellipsis,
  ImageOff,
  Pencil,
} from "lucide-react";
import StorageFiles from "@/models/files";
import { openImageLightbox } from "@/components/ImageLightbox";
import { PASTE_ATTACHMENT_EVENT } from "@/components/WorkspaceChat/ChatContainer/DnDWrapper";
import { PROMPT_INPUT_EVENT } from "@/components/WorkspaceChat/ChatContainer/PromptInput";

/**
 * Renders a generated image returned by the `/img` command. The serve endpoint
 * is auth-protected, so we fetch the image as a blob and render an object URL.
 * @param {{content: {storageFilename: string, filename?: string, prompt?: string}}} props
 */
function ImageGenerationCard({ props }) {
  const { t } = useTranslation();
  const { storageFilename, filename, prompt } = props.content || {};
  const [blob, setBlob] = useState(null);
  const [objectUrl, setObjectUrl] = useState(null);
  const [status, setStatus] = useState("loading");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let revokeUrl = null;
    async function loadImage() {
      const result = await StorageFiles.image(storageFilename);
      if (!result) return setStatus("failed");
      revokeUrl = URL.createObjectURL(result);
      setBlob(result);
      setObjectUrl(revokeUrl);
      setStatus("ready");
    }
    if (storageFilename) {
      loadImage();
    } else {
      setStatus("failed");
    }
    return () => {
      if (revokeUrl) URL.revokeObjectURL(revokeUrl);
    };
  }, [storageFilename]);

  const handleDownload = () => {
    if (!blob) return;
    saveAs(blob, filename || storageFilename);
  };

  const handleCopy = async () => {
    if (!blob) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleEdit = async () => {
    if (!blob) return;

    const file = new File([blob], filename || storageFilename, {
      type: blob.type,
    });

    window.dispatchEvent(
      new CustomEvent(PASTE_ATTACHMENT_EVENT, {
        detail: {
          files: [file],
          storageFilename,
        },
      })
    );

    window.dispatchEvent(
      new CustomEvent(PROMPT_INPUT_EVENT, {
        detail: { messageContent: "/img ", writeMode: "replace" },
      })
    );
  };

  return (
    <div className="my-2">
      <div className="inline-block">
        {status !== "ready" && (
          <div className="relative rounded-xl overflow-hidden bg-zinc-800 aspect-square w-[280px]">
            {status === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner
                  size="lg"
                  className="text-zinc-400 light:text-slate-500"
                />
              </div>
            )}

            {status === "failed" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-y-2 text-zinc-400 light:text-slate-500">
                <ImageOff size={28} />
                <span className="text-xs">
                  {t("imageGeneration.card.failed-to-load")}
                </span>
              </div>
            )}
          </div>
        )}

        {status === "ready" && (
          <div className="relative group rounded-xl overflow-hidden bg-zinc-800 max-w-max">
            <img
              src={objectUrl}
              alt={prompt || t("imageGeneration.card.alt-text")}
              role="button"
              tabIndex={0}
              onClick={() =>
                openImageLightbox([
                  { contentString: objectUrl, name: filename || prompt },
                ])
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openImageLightbox([
                    { contentString: objectUrl, name: filename || prompt },
                  ]);
                }
              }}
              className="max-h-[280px] max-w-[500px] object-contain cursor-pointer"
            />

            {/* Copy — bottom left */}
            <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="border-none p-2 rounded-lg bg-black/60 hover:bg-black/80 light:bg-slate-200/60 light:hover:bg-slate-200 text-theme-text-primary light:text-slate-700"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>

            {/* 3-dot menu — top right */}
            <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      className="border-none p-2 rounded-lg bg-black/60 hover:bg-black/80 light:bg-slate-200/60 light:hover:bg-slate-200 text-theme-text-primary light:text-slate-700"
                      aria-label={t("imageGeneration.card.edit")}
                    />
                  }
                >
                  <Ellipsis size={16} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={handleEdit}>
                    <Pencil />
                    {t("imageGeneration.card.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownload}>
                    <Download />
                    {t("imageGeneration.card.download")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ImageGenerationCard);
