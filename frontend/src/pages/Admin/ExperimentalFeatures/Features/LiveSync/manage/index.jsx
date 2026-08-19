import { useEffect, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import Sidebar, { SidebarPageLayout } from "@/components/Sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import System from "@/models/system";
import DocumentSyncQueueRow from "./DocumentSyncQueueRow";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function LiveDocumentSyncManager() {
  return (
    <SidebarPageLayout className="bg-theme-bg-container light:bg-theme-bg-container">
      <Sidebar />
      <div
        style={{ height: "100%" }}
        className="relative bg-theme-bg-secondary w-full h-full overflow-y-scroll p-4 md:p-0"
      >
        <div className="flex flex-col w-full px-1 py-16 md:px-6 md:py-6">
          <PageHeader
            title={"Watched documents"}
            description={
              "These are all the documents that are currently being watched in your instance. The content of these documents will be periodically synced."
            }
          />
          <div className="overflow-x-auto">
            <WatchedDocumentsContainer />
          </div>
        </div>
      </div>
    </SidebarPageLayout>
  );
}

function WatchedDocumentsContainer() {
  const [loading, setLoading] = useState(true);
  const [queues, setQueues] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const _queues = await System.experimentalFeatures.liveSync.queues();
      setQueues(_queues);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <Skeleton
        height="80vh"
        width="100%"
        highlightColor="var(--theme-bg-primary)"
        baseColor="var(--theme-bg-secondary)"
        count={1}
        className="w-full p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm mt-6"
        containerClassName="flex w-full"
      />
    );
  }

  return (
    <Table className="text-left rounded-lg mt-6 min-w-[640px]">
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Document Name</TableHead>
          <TableHead scope="col">Last Synced</TableHead>
          <TableHead scope="col">Time until next refresh</TableHead>
          <TableHead scope="col">Created On</TableHead>
          <TableHead scope="col"> </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {queues.map((queue) => (
          <DocumentSyncQueueRow key={queue.id} queue={queue} />
        ))}
      </TableBody>
    </Table>
  );
}
