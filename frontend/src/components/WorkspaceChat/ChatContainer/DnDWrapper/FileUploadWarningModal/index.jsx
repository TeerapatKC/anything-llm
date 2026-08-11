import { CircleNotch } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import pluralize from "pluralize";
import { numberWithCommas } from "@/utils/numbers";
import useUser from "@/hooks/useUser";
import { Link } from "react-router-dom";
import Paths from "@/utils/paths";
import Workspace from "@/models/workspace";

export default function FileUploadWarningModal({
  show,
  onClose,
  onContinue,
  onEmbed,
  tokenCount,
  maxTokens,
  fileCount = 1,
  isEmbedding = false,
  embedProgress = 0,
}) {
  const { user } = useUser();
  const canEmbed = !user || user.role !== "default";
  if (!show) return null;

  if (isEmbedding) {
    return (
      <Dialog open={show}>
        <DialogContent
          className="max-w-[600px] bg-theme-bg-primary border-theme-modal-border [&>button]:hidden"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Embedding files</DialogTitle>
          <div className="flex flex-col items-center justify-center">
            <p className="text-white text-sm font-semibold mb-4">
              Embedding {embedProgress + 1} of {fileCount}{" "}
              {pluralize("file", fileCount)}
            </p>
            <CircleNotch size={32} className="animate-spin text-white" />
            <p className="text-white/60 text-sm mt-2">
              Please wait while we embed your files...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[600px] bg-theme-bg-primary border-theme-modal-border">
        <DialogHeader className="p-0">
          <DialogTitle className="text-sm font-semibold">
            Context Window Warning
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-theme-text-primary text-sm">
            Your workspace is using {numberWithCommas(tokenCount)} of{" "}
            {numberWithCommas(maxTokens)} available tokens. We recommend keeping
            usage below {(Workspace.maxContextWindowLimit * 100).toFixed(0)}% to
            ensure the best chat experience. Adding {fileCount} more{" "}
            {pluralize("file", fileCount)} would exceed this limit.{" "}
            <Link
              target="_blank"
              to={Paths.documentation.contextWindows()}
              className="text-theme-text-secondary text-sm underline"
            >
              Learn more about context windows &rarr;
            </Link>
          </p>
          <p className="text-theme-text-primary text-sm">
            Choose how you would like to proceed with these uploads.
          </p>
        </div>

        <DialogFooter className="p-0 sm:justify-between">
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={onContinue} type="button">
              Continue Anyway
            </Button>
            {canEmbed && (
              <Button
                variant="default"
                onClick={onEmbed}
                disabled={isEmbedding || !canEmbed}
                type="button"
              >
                Embed {pluralize("File", fileCount)}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
