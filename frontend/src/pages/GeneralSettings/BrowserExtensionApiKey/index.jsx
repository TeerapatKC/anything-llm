import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
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
  TableLoadingRow,
  TableRow,
} from "@/components/ui/table";

export default function BrowserExtensionApiKeys() {
  const { t } = useTranslation();
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
        title={t("settings-page.browser-extension.title")}
        description={t("settings-page.browser-extension.description")}
      />
      <div className="w-full justify-end flex">
        <Dialog
          open={isOpen}
          onOpenChange={(open) => (open ? openModal() : closeModal())}
        >
          <DialogTrigger
            render={
              <Button size="lg" className="mt-3 mb-4" disabled={loading} />
            }
          >
            <CirclePlus className="h-4 w-4" />
            Generate New API Key
          </DialogTrigger>
          <DialogContent>
            <NewBrowserExtensionApiKeyModal onSuccess={fetchExistingKeys} />
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto mt-6">
        <Table className="text-left min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead scope="col">
                {t("browser-extension-keys.table.connection-string")}
              </TableHead>
              <TableHead scope="col">
                {t("browser-extension-keys.table.created-by")}
              </TableHead>
              <TableHead scope="col">
                {t("browser-extension-keys.table.created-at")}
              </TableHead>
              <TableHead scope="col">
                {t("browser-extension-keys.table.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableLoadingRow colSpan={4} />
            ) : error ? (
              <TableEmptyRow colSpan={4}>
                {t("browser-extension-keys.error", { error })}
              </TableEmptyRow>
            ) : apiKeys.length === 0 ? (
              <TableEmptyRow
                colSpan={4}
                description={t("browser-extension-keys.empty-description")}
              >
                {t("browser-extension-keys.empty")}
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
      </div>
    </SettingsLayout>
  );
}
