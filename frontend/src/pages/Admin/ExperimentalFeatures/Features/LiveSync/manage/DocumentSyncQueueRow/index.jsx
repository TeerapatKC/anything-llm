import { useRef } from "react";
import { Trash2 } from "lucide-react";
import { stripUuidAndJsonFromString } from "@/components/Modals/ManageWorkspace/Documents/Directory/utils";
import moment from "moment";
import System from "@/models/system";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

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
      <TableRow ref={rowRef}>
        <TableCell scope="row">
          {stripUuidAndJsonFromString(queue.workspaceDoc.filename)}
        </TableCell>
        <TableCell>{moment(queue.lastSyncedAt).fromNow()}</TableCell>
        <TableCell>
          {moment(queue.nextSyncAt).format("lll")}
          <i className="text-xs px-2">({moment(queue.nextSyncAt).fromNow()})</i>
        </TableCell>
        <TableCell>{moment(queue.createdAt).format("lll")}</TableCell>
        <TableCell className="text-right">
          <Button variant="destructive" size="icon-sm" onClick={handleDelete}>
            <Trash2 className="h-5 w-5" />
          </Button>
        </TableCell>
      </TableRow>
    </>
  );
}
