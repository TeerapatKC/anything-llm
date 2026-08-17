import { memo, useState } from "react";
import {
  formatDateTimeAsMoment,
  getFileExtension,
  middleTruncate,
} from "@/utils/directories";
import { Undo2, Eye, EyeOff, FileText, Pin } from "lucide-react";
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import System from "@/models/system";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";

export default function WorkspaceFileRow({
  item,
  folderName,
  workspace,
  setLoading,
  setLoadingMessage,
  fetchKeys,
  hasChanges,
  movedItems,
  selected,
  toggleSelection,
  disableSelection,
  setSelectedItems,
}) {
  const onRemoveClick = async (e) => {
    e.stopPropagation();
    setLoading(true);

    try {
      setLoadingMessage(`Removing file from workspace`);
      await Workspace.modifyEmbeddings(workspace.slug, {
        adds: [],
        deletes: [`${folderName}/${item.name}`],
      });
      await fetchKeys(true);
    } catch (error) {
      console.error("Failed to remove document:", error);
    }
    setSelectedItems({});
    setLoadingMessage("");
    setLoading(false);
  };

  function toggleRowSelection(e) {
    if (disableSelection) return;
    e.stopPropagation();
    toggleSelection();
  }

  function handleRowSelection(e) {
    e.stopPropagation();
    toggleSelection();
  }

  const isMovedItem = movedItems?.some((movedItem) => movedItem.id === item.id);
  return (
    <div
      className={`text-theme-text-primary text-xs grid grid-cols-12 py-2 pl-3.5 pr-8 h-[34px] items-center file-row ${
        !disableSelection
          ? "hover:bg-theme-file-picker-hover cursor-pointer"
          : ""
      } ${isMovedItem ? "selected light:text-white" : ""} ${
        selected ? "selected light:text-white" : ""
      }`}
      onClick={toggleRowSelection}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="col-span-10 w-fit flex gap-x-2 items-center relative">
            <div className="shrink-0 w-3.5 h-3.5">
              {!disableSelection ? (
                <Checkbox
                  checked={selected}
                  className="shrink-0 h-3.5 w-3.5 border-white/60 data-[state=checked]:border-white"
                  onClick={handleRowSelection}
                />
              ) : null}
            </div>
            <FileText className="shrink-0 h-3.5 w-3.5 mr-[3px] ml-1" />
            <p className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[400px]">
              {middleTruncate(item.title, 50)}
            </p>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px] text-xs">
          {JSON.stringify({
            title: item.title,
            date: formatDateTimeAsMoment(item?.published),
            extension: getFileExtension(item.url),
          })}
        </TooltipContent>
      </Tooltip>
      <div className="col-span-2 flex justify-end items-center">
        {hasChanges ? (
          <div className="w-4 h-4 ml-2 flex-shrink-0" />
        ) : (
          <div className="flex gap-x-2 items-center">
            <WatchForChanges
              workspace={workspace}
              docPath={`${folderName}/${item.name}`}
              item={item}
            />
            <PinItemToWorkspace
              workspace={workspace}
              docPath={`${folderName}/${item.name}`}
              item={item}
            />
            <RemoveItemFromWorkspace item={item} onClick={onRemoveClick} />
          </div>
        )}
      </div>
    </div>
  );
}

const PinItemToWorkspace = memo(({ workspace, docPath, item }) => {
  const [pinned, setPinned] = useState(
    item?.pinnedWorkspaces?.includes(workspace.id) || false
  );
  const pinEvent = new CustomEvent("pinned_document");

  const updatePinStatus = async (e) => {
    try {
      e.stopPropagation();
      if (!pinned) window.dispatchEvent(pinEvent);
      const success = await Workspace.setPinForDocument(
        workspace.slug,
        docPath,
        !pinned
      );

      if (!success) {
        showToast(`Failed to ${!pinned ? "pin" : "unpin"} document.`, "error", {
          clear: true,
        });
        return;
      }

      showToast(
        `Document ${!pinned ? "pinned to" : "unpinned from"} workspace`,
        "success",
        { clear: true }
      );
      setPinned(!pinned);
    } catch (error) {
      showToast(`Failed to pin document. ${error.message}`, "error", {
        clear: true,
      });
      return;
    }
  };

  if (!item) return <div className="w-[16px] p-[2px] ml-2" />;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          onClick={updatePinStatus}
          className="group flex items-center ml-2 cursor-pointer"
        >
          {pinned ? (
            <div className="bg-theme-settings-input-active group-hover:bg-red-500/20 rounded-3xl whitespace-nowrap">
              <p className="text-xs px-2 py-0.5 group-hover:text-red-500">
                <span className="group-hover:hidden">Pinned</span>
                <span className="hidden group-hover:inline">Un-pin</span>
              </p>
            </div>
          ) : (
            <Pin className="h-4 w-4 outline-none flex-shrink-0" />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[250px] text-xs">
        {pinned ? "Un-pin from workspace" : "Pin to workspace"}
      </TooltipContent>
    </Tooltip>
  );
});

const WatchForChanges = memo(({ workspace, docPath, item }) => {
  const [watched, setWatched] = useState(item?.watched || false);
  const watchEvent = new CustomEvent("watch_document_for_changes");

  const updateWatchStatus = async (e) => {
    try {
      e.stopPropagation();
      if (!watched) window.dispatchEvent(watchEvent);
      const success =
        await System.experimentalFeatures.liveSync.setWatchStatusForDocument(
          workspace.slug,
          docPath,
          !watched
        );

      if (!success) {
        showToast(
          `Failed to ${!watched ? "watch" : "unwatch"} document.`,
          "error",
          {
            clear: true,
          }
        );
        return;
      }

      showToast(
        `Document ${
          !watched
            ? "will be watched for changes"
            : "will no longer be watched for changes"
        }.`,
        "success",
        { clear: true }
      );
      setWatched(!watched);
    } catch (error) {
      showToast(`Failed to watch document. ${error.message}`, "error", {
        clear: true,
      });
      return;
    }
  };

  if (!item || !item.canWatch) return <div className="w-[16px] p-[2px] ml-2" />;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="group flex gap-x-2 items-center hover:bg-theme-file-picker-hover p-[2px] rounded ml-2 cursor-pointer"
          onClick={updateWatchStatus}
        >
          {watched ? (
            <Eye className="h-4 w-4 outline-none flex-shrink-0" />
          ) : (
            <EyeOff className="h-4 w-4 outline-none flex-shrink-0" />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[250px] text-xs">
        {watched ? "Stop watching for changes" : "Watch document for changes"}
      </TooltipContent>
    </Tooltip>
  );
});

const RemoveItemFromWorkspace = ({ item: _item, onClick }) => {
  return (
    <div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Undo2
            onClick={onClick}
            className="h-4 w-4 ml-2 flex-shrink-0 cursor-pointer"
          />
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px] text-xs">
          Remove document from workspace
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
