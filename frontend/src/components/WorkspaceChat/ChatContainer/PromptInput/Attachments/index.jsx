import {
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  OctagonAlert,
  X,
} from "lucide-react";
import { REMOVE_ATTACHMENT_EVENT } from "../../DnDWrapper";
import { Spinner } from "@/components/ui/spinner";
import { openImageLightbox } from "@/components/ImageLightbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * @param {{attachments: import("../../DnDWrapper").Attachment[]}}
 * @returns
 */
export default function AttachmentManager({ attachments }) {
  if (attachments.length === 0) return null;

  function handleImageClick(attachment) {
    const imageAttachments = attachments
      .filter((a) => a.type === "attachment" && a.contentString)
      .map((a) => ({ contentString: a.contentString, name: a.file.name }));
    const idx = imageAttachments.findIndex(
      (img) => img.name === attachment.file?.name
    );
    if (idx !== -1) openImageLightbox(imageAttachments, idx);
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2 mb-4">
      {attachments.map((attachment) => (
        <AttachmentItem
          key={attachment.uid}
          attachment={attachment}
          onImageClick={() => handleImageClick(attachment)}
        />
      ))}
    </div>
  );
}

/**
 * @param {{attachment: import("../../DnDWrapper").Attachment}}
 */
function AttachmentItem({ attachment, onImageClick }) {
  const { uid, file, status, error, document, type, contentString } =
    attachment;
  const { iconBgColor, Icon } = displayFromFile(file);

  function removeFileFromQueue() {
    window.dispatchEvent(
      new CustomEvent(REMOVE_ATTACHMENT_EVENT, { detail: { uid, document } })
    );
  }

  if (status === "in_progress") {
    return (
      <div className="relative flex items-center gap-x-1 rounded-lg bg-theme-attachment-bg border-none w-[180px] group">
        <div
          className={`bg-theme-attachment-icon-spinner-bg rounded-md flex items-center justify-center flex-shrink-0 h-[32px] w-[32px] m-1`}
        >
          <Spinner className="text-theme-attachment-icon-spinner" />
        </div>
        <div className="flex flex-col w-[125px]">
          <p className="text-theme-attachment-text text-xs font-semibold truncate">
            {file.name}
          </p>
          <p className="text-theme-attachment-text-secondary text-[10px] leading-[14px] font-medium">
            Uploading...
          </p>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`relative flex items-center gap-x-1 rounded-lg bg-theme-attachment-error-bg border-none w-[180px] group`}
          >
            <div className="invisible group-hover:visible absolute -top-[5px] -right-[5px] w-fit h-fit z-[10]">
              <button
                onClick={removeFileFromQueue}
                type="button"
                className="bg-white hover:bg-error hover:text-theme-attachment-text rounded-full p-1 flex items-center justify-center hover:border-transparent border border-theme-attachment-bg"
              >
                <X size={10} className="flex-shrink-0" />
              </button>
            </div>
            <div
              className={`bg-error rounded-md flex items-center justify-center flex-shrink-0 h-[32px] w-[32px] m-1`}
            >
              <OctagonAlert size={24} className="text-theme-attachment-icon" />
            </div>
            <div className="flex flex-col w-[125px]">
              <p className="text-theme-attachment-text text-xs font-semibold truncate">
                {file.name}
              </p>
              <p className="text-theme-attachment-text-secondary text-[10px] leading-[14px] font-medium truncate">
                {error ?? "File not embedded!"}
              </p>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px] text-xs">
          {error}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (type === "attachment") {
    if (contentString) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`relative flex items-center gap-x-1 rounded-lg border-none group`}
            >
              <div className="invisible group-hover:visible absolute -top-[5px] -right-[5px] w-fit h-fit z-[10]">
                <button
                  onClick={removeFileFromQueue}
                  type="button"
                  className="bg-white hover:bg-error hover:text-theme-attachment-text rounded-full p-1 flex items-center justify-center hover:border-transparent border border-theme-attachment-bg"
                >
                  <X size={10} className="flex-shrink-0" />
                </button>
              </div>
              <button
                type="button"
                onClick={onImageClick}
                className="p-0 border-none bg-transparent cursor-pointer"
              >
                <img
                  alt={`Preview of ${file.name}`}
                  src={contentString}
                  style={{ objectFit: "cover", objectPosition: "center" }}
                  className={`${iconBgColor} w-[40px] h-[40px] rounded-lg flex items-center justify-center`}
                />
              </button>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-[250px] text-xs"
          >{`${file.name} will be attached to this prompt. It will not be embedded into the workspace permanently.`}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`relative flex items-center gap-x-1 rounded-lg bg-theme-attachment-success-bg border-none w-[180px] group`}
          >
            <div className="invisible group-hover:visible absolute -top-[5px] -right-[5px] w-fit h-fit z-[10]">
              <button
                onClick={removeFileFromQueue}
                type="button"
                className="bg-white hover:bg-error hover:text-theme-attachment-text rounded-full p-1 flex items-center justify-center hover:border-transparent border border-theme-attachment-bg"
              >
                <X size={10} className="flex-shrink-0" />
              </button>
            </div>
            <div
              className={`${iconBgColor} rounded-md flex items-center justify-center flex-shrink-0 h-[32px] w-[32px] m-1`}
            >
              <Icon size={24} className="text-theme-attachment-icon" />
            </div>
            <div className="flex flex-col w-[125px]">
              <p className="text-theme-attachment-text text-xs font-semibold truncate">
                {file.name}
              </p>
              <p className="text-theme-attachment-text-secondary text-[10px] leading-[14px] font-medium">
                Image attached!
              </p>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[250px] text-xs"
        >{`${file.name} will be attached to this prompt. It will not be embedded into the workspace permanently.`}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`relative flex items-center gap-x-1 rounded-lg bg-theme-attachment-bg border-none w-[180px] group`}
        >
          <div className="invisible group-hover:visible absolute -top-[5px] -right-[5px] w-fit h-fit z-[10]">
            <button
              onClick={removeFileFromQueue}
              type="button"
              className="bg-white hover:bg-error hover:text-theme-attachment-text rounded-full p-1 flex items-center justify-center hover:border-transparent border border-theme-attachment-bg"
            >
              <X size={10} className="flex-shrink-0" />
            </button>
          </div>
          <div
            className={`${iconBgColor} rounded-md flex items-center justify-center flex-shrink-0 h-[32px] w-[32px] m-1`}
          >
            <Icon size={24} className="text-theme-attachment-icon" />
          </div>
          <div className="flex flex-col w-[125px]">
            <p className="text-theme-text-primary text-xs font-semibold truncate">
              {file.name}
            </p>
            <p className="text-theme-attachment-text-secondary text-[10px] leading-[14px] font-medium">
              {status === "embedded" ? "File embedded!" : "Added as context!"}
            </p>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[250px] text-xs">
        {status === "embedded"
          ? `${file.name} was uploaded and embedded into this workspace. It will be available for RAG chat now.`
          : `${file.name} will be used as context for this chat only.`}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * @param {File} file
 * @returns {{iconBgColor:string, Icon: React.Component}}
 */
function displayFromFile(file) {
  const extension = file?.name?.split(".")?.pop()?.toLowerCase() ?? "txt";
  switch (extension) {
    case "pdf":
      return { iconBgColor: "bg-magenta", Icon: FileText };
    case "doc":
    case "docx":
      return { iconBgColor: "bg-royalblue", Icon: FileText };
    case "html":
      return { iconBgColor: "bg-purple", Icon: FileCode };
    case "csv":
    case "xlsx":
      return { iconBgColor: "bg-success", Icon: FileSpreadsheet };
    case "json":
    case "sql":
    case "js":
    case "jsx":
    case "cpp":
    case "c":
      return { iconBgColor: "bg-warn", Icon: FileCode };
    case "png":
    case "jpg":
    case "jpeg":
      return { iconBgColor: "bg-royalblue", Icon: FileImage };
    default:
      return { iconBgColor: "bg-royalblue", Icon: FileText };
  }
}
