import { useRef } from "react";
import { Trash2 } from "lucide-react";
import { stripUuidAndJsonFromString } from "@/components/Modals/ManageWorkspace/Documents/Directory/utils";
import moment from "moment";
import System from "@/models/system";
import { TableCell, TableRow } from "@/components/ui/table";

export default function DocumentSyncQueueRow({ queue }) {
  const rowRef = useRef(null);
  const handleDelete = async () => {
    rowRef?.current?.remove();
    await System.experimentalFeatures.liveSync.setWatchStatusForDocument(
      queue.workspaceDoc.workspace.slug,
      queue.workspaceDoc.docpath,
      false
    );
  };

  return (
    <>
      <TableRow
        variant="none"
        ref={rowRef}
        className="bg-transparent text-theme-text-primary text-opacity-80 text-sm font-medium"
      >
        <TableCell
          variant="none"
          scope="row"
          className="px-6 py-4 whitespace-nowrap"
        >
          {stripUuidAndJsonFromString(queue.workspaceDoc.filename)}
        </TableCell>
        <TableCell variant="none" className="px-6 py-4">
          {moment(queue.lastSyncedAt).fromNow()}
        </TableCell>
        <TableCell variant="none" className="px-6 py-4">
          {moment(queue.nextSyncAt).format("lll")}
          <i className="text-xs px-2">({moment(queue.nextSyncAt).fromNow()})</i>
        </TableCell>
        <TableCell variant="none" className="px-6 py-4">
          {moment(queue.createdAt).format("lll")}
        </TableCell>
        <TableCell
          variant="none"
          className="px-6 py-4 flex items-center gap-x-6"
        >
          <button
            onClick={handleDelete}
            className="border-none font-medium px-2 py-1 rounded-lg text-theme-text-primary hover:text-red-500"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </TableCell>
      </TableRow>
    </>
  );
}
