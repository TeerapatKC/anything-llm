import { useEffect, useState } from "react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { CirclePlus } from "lucide-react";
import BrowserExtensionApiKey from "@/models/browserExtensionApiKey";
import BrowserExtensionApiKeyRow from "./BrowserExtensionApiKeyRow";
import { Button } from "@/components/ui/button";
import NewBrowserExtensionApiKeyModal from "./NewBrowserExtensionApiKeyModal";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useModal } from "@/hooks/useModal";
import { fullApiUrl } from "@/utils/constants";
import {
  Table,
  TableBody,
  TableEmptyRow,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function BrowserExtensionApiKeys() {
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState([]);
  const [error, setError] = useState(null);
  const { isOpen, openModal, closeModal } = useModal();

  useEffect(() => {
    fetchExistingKeys();
  }, []);

  const fetchExistingKeys = async () => {
    const result = await BrowserExtensionApiKey.getAll();
    if (result.success) {
      setApiKeys(result.apiKeys);
    } else {
      setError(result.error || "Failed to fetch API keys");
    }
    setLoading(false);
  };

  const removeApiKey = (id) => {
    setApiKeys((prevKeys) => prevKeys.filter((apiKey) => apiKey.id !== id));
  };

  return (
    <SettingsLayout>
      <PageHeader
        title={"Browser Extension API Keys"}
        description={
          "Manage API keys for browser extensions connecting to your NexusAI instance."
        }
      />
      <div className="w-full justify-end flex">
        <Dialog
          open={isOpen}
          onOpenChange={(open) => (open ? openModal() : closeModal())}
        >
          <DialogTrigger render={<Button size="lg" className="mt-3 mb-4" />}>
            <CirclePlus className="h-4 w-4" />
            Generate New API Key
          </DialogTrigger>
          <DialogContent>
            <NewBrowserExtensionApiKeyModal onSuccess={fetchExistingKeys} />
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto mt-6">
        {loading ? (
          <Skeleton
            height="80vh"
            width="100%"
            highlightColor="var(--theme-bg-primary)"
            baseColor="var(--theme-bg-secondary)"
            count={1}
            className="w-full p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm"
            containerClassName="flex w-full"
          />
        ) : error ? (
          <div className="text-red-500 mt-6">Error: {error}</div>
        ) : (
          <Table className="text-left min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Extension Connection String</TableHead>
                <TableHead scope="col">Created By</TableHead>
                <TableHead scope="col">Created At</TableHead>
                <TableHead scope="col">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.length === 0 ? (
                <TableEmptyRow
                  colSpan="4"
                  description="Generate a key to connect the browser extension to this instance."
                >
                  No API keys yet
                </TableEmptyRow>
              ) : (
                apiKeys.map((apiKey) => (
                  <BrowserExtensionApiKeyRow
                    key={apiKey.id}
                    apiKey={apiKey}
                    removeApiKey={removeApiKey}
                    connectionString={`${fullApiUrl()}|${apiKey.key}`}
                  />
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </SettingsLayout>
  );
}
