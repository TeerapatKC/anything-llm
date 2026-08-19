import { useEffect, useState } from "react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { CirclePlus } from "lucide-react";
import Admin from "@/models/admin";
import ApiKeyRow from "./ApiKeyRow";
import NewApiKeyModal from "./NewApiKeyModal";
import paths from "@/utils/paths";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useModal } from "@/hooks/useModal";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableEmptyRow,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminApiKeys() {
  const { isOpen, openModal, closeModal } = useModal();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState([]);

  const fetchExistingKeys = async () => {
    const { apiKeys: foundKeys } = await Admin.getApiKeys();
    setApiKeys(foundKeys);
    setLoading(false);
  };

  useEffect(() => {
    fetchExistingKeys();
  }, []);

  const removeApiKey = (id) => {
    setApiKeys((prevKeys) => prevKeys.filter((apiKey) => apiKey.id !== id));
  };

  return (
    <SettingsLayout>
      <PageHeader title={t("api.title")} description={t("api.description")}>
        <a
          href={paths.apiDocs()}
          target="_blank"
          rel="noreferrer"
          className="text-xs leading-[18px] font-base text-blue-300 light:text-blue-500 hover:underline"
        >
          {t("api.link")} &rarr;
        </a>
      </PageHeader>
      <div className="w-full justify-end flex">
        <Dialog
          open={isOpen}
          onOpenChange={(open) => (open ? openModal() : closeModal())}
        >
          <DialogTrigger
            render={
              <Button size="lg" className="mt-3 mr-0 mb-4 md:-mb-14 z-10" />
            }
          >
            <CirclePlus className="h-4 w-4" /> {t("api.generate")}
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border">
            <NewApiKeyModal onSuccess={fetchExistingKeys} />
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
        ) : (
          <Table className="w-full text-xs text-left rounded-lg min-w-[720px] border-spacing-0 md:mt-6 mt-0">
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="px-6 py-3 rounded-tl-lg">
                  {t("api.table.name")}
                </TableHead>
                <TableHead scope="col" className="px-6 py-3">
                  {t("api.table.key")}
                </TableHead>
                <TableHead scope="col" className="px-6 py-3">
                  {t("api.table.by")}
                </TableHead>
                <TableHead scope="col" className="px-6 py-3">
                  {t("api.table.created")}
                </TableHead>
                <TableHead scope="col" className="px-6 py-3 rounded-tr-lg">
                  {t("api.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.length === 0 ? (
                <TableEmptyRow colSpan="5">{t("api.empty")}</TableEmptyRow>
              ) : (
                apiKeys.map((apiKey) => (
                  <ApiKeyRow
                    key={apiKey.id}
                    apiKey={apiKey}
                    removeApiKey={removeApiKey}
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
