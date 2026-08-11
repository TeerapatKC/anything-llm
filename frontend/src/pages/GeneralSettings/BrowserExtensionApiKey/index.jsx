import { useEffect, useState } from "react";
import Sidebar from "@/components/SettingsSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle } from "@phosphor-icons/react";
import BrowserExtensionApiKey from "@/models/browserExtensionApiKey";
import BrowserExtensionApiKeyRow from "./BrowserExtensionApiKeyRow";
import CTAButton from "@/components/lib/CTAButton";
import NewBrowserExtensionApiKeyModal from "./NewBrowserExtensionApiKeyModal";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useModal } from "@/hooks/useModal";
import { fullApiUrl } from "@/utils/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function BrowserExtensionApiKeys() {
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState([]);
  const [error, setError] = useState(null);
  const { isOpen, openModal, closeModal } = useModal();
  const [isMultiUser, setIsMultiUser] = useState(false);

  useEffect(() => {
    fetchExistingKeys();
  }, []);

  const fetchExistingKeys = async () => {
    const result = await BrowserExtensionApiKey.getAll();
    if (result.success) {
      setApiKeys(result.apiKeys);
      setIsMultiUser(result.apiKeys.some((key) => key.user !== null));
    } else {
      setError(result.error || "Failed to fetch API keys");
    }
    setLoading(false);
  };

  const removeApiKey = (id) => {
    setApiKeys((prevKeys) => prevKeys.filter((apiKey) => apiKey.id !== id));
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      <div
        style={{ height: "100%" }}
        className="relative bg-theme-bg-secondary w-full h-full overflow-y-scroll p-4 md:p-0"
      >
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
          <div className="w-full flex flex-col gap-y-1 pb-6 border-white/10 border-b-2">
            <div className="items-center flex gap-x-4">
              <p className="text-lg leading-6 font-bold text-theme-text-primary">
                Browser Extension API Keys
              </p>
            </div>
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
              Manage API keys for browser extensions connecting to your
              AnythingLLM instance.
            </p>
          </div>
          <div className="w-full justify-end flex">
            <Dialog
              open={isOpen}
              onOpenChange={(open) => (open ? openModal() : closeModal())}
            >
              <DialogTrigger asChild>
                <CTAButton className="mt-3 mr-0 mb-4 md:-mb-14 z-10">
                  <PlusCircle className="h-4 w-4" weight="bold" />
                  Generate New API Key
                </CTAButton>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border">
                <NewBrowserExtensionApiKeyModal
                  onSuccess={fetchExistingKeys}
                  isMultiUser={isMultiUser}
                />
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
              <Table
                variant="none"
                className="w-full text-xs text-left rounded-lg min-w-[640px] border-spacing-0 md:mt-6 mt-0"
              >
                <TableHeader variant="settings">
                  <TableRow variant="none">
                    <TableHead
                      variant="none"
                      scope="col"
                      className="px-6 py-2 rounded-tl-lg"
                    >
                      Extension Connection String
                    </TableHead>
                    {isMultiUser && (
                      <TableHead
                        variant="none"
                        scope="col"
                        className="px-6 py-2"
                      >
                        Created By
                      </TableHead>
                    )}
                    <TableHead variant="none" scope="col" className="px-6 py-2">
                      Created At
                    </TableHead>
                    <TableHead
                      variant="none"
                      scope="col"
                      className="px-6 py-2 rounded-tr-lg"
                    >
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody variant="none">
                  {apiKeys.length === 0 ? (
                    <TableRow variant="settings">
                      <TableCell
                        variant="none"
                        colSpan={isMultiUser ? "4" : "3"}
                        className="px-6 py-4 text-center"
                      >
                        No API keys found
                      </TableCell>
                    </TableRow>
                  ) : (
                    apiKeys.map((apiKey) => (
                      <BrowserExtensionApiKeyRow
                        key={apiKey.id}
                        apiKey={apiKey}
                        removeApiKey={removeApiKey}
                        connectionString={`${fullApiUrl()}|${apiKey.key}`}
                        isMultiUser={isMultiUser}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
