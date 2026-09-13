import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CirclePlus, List, Pencil, Trash2 } from "lucide-react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import TableRowActions from "@/components/lib/TableRowActions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeader,
  TableLoadingRow,
  TableRow,
} from "@/components/ui/table";
import ModelRouter from "@/models/modelRouter";
import { useModal } from "@/hooks/useModal";
import showToast from "@/utils/toast";
import paths from "@/utils/paths";
import NewRouterModal from "./NewRouterModal";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function ModelRouters() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isOpen, openModal, closeModal } = useModal();
  const [loading, setLoading] = useState(true);
  const [routers, setRouters] = useState([]);
  const [editingRouter, setEditingRouter] = useState(null);
  const [confirm, setConfirm] = useState(null);

  async function fetchRouters() {
    setRouters(await ModelRouter.getAll());
    setLoading(false);
  }

  useEffect(() => {
    fetchRouters();
  }, []);

  function closeEditor() {
    closeModal();
    setEditingRouter(null);
  }

  function confirmDelete(router) {
    setConfirm({
      title: t("model-router.delete-confirm", { name: router.name }),
      confirmText: t("common.delete", "Delete"),
      variant: "destructive",
      onConfirm: async () => {
        const { success, error } = await ModelRouter.delete(router.id);
        if (success)
          setRouters((current) =>
            current.filter((item) => item.id !== router.id)
          );
        else
          showToast(t("model-router.toast-delete-failed", { error }), "error");
      },
    });
  }

  function openRules(router) {
    navigate(paths.settings.modelRouterRules(router.id));
  }

  return (
    <SettingsLayout>
      <PageHeader
        title={t("model-router.title")}
        description={t("model-router.description")}
      />
      <div className="mt-3 mb-4 flex w-full justify-end">
        <Button
          type="button"
          size="lg"
          onClick={() => {
            setEditingRouter(null);
            openModal();
          }}
        >
          <CirclePlus className="size-4" />
          {t("model-router.new-router-button")}
        </Button>
      </div>
      <Table className="min-w-[560px]">
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{t("model-router.table.name")}</TableHead>
            <TableHead scope="col">
              {t("model-router.table.fallback")}
            </TableHead>
            <TableHead scope="col">{t("model-router.table.rules")}</TableHead>
            <TableHead scope="col">
              {t("model-router.table.workspaces")}
            </TableHead>
            <TableHead scope="col" className="w-12">
              <span className="sr-only">{t("ui.open-actions")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableLoadingRow colSpan={5} />
          ) : routers.length === 0 ? (
            <TableEmptyRow colSpan={5}>
              {t("model-router.no-routers")}
            </TableEmptyRow>
          ) : (
            routers.map((router) => (
              <TableRow
                key={router.id}
                tabIndex={0}
                aria-label={t("model-router.table.configure-rules-for", {
                  name: router.name,
                })}
                onClick={() => openRules(router)}
                onKeyDown={(event) => {
                  if (
                    event.target === event.currentTarget &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    event.preventDefault();
                    openRules(router);
                  }
                }}
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-button"
              >
                <TableCell className="max-w-[260px] whitespace-normal">
                  <span className="font-medium text-theme-text-primary">
                    {router.name}
                  </span>
                  {router.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-theme-text-secondary">
                      {router.description}
                    </p>
                  )}
                </TableCell>
                <TableCell
                  className="max-w-[240px] truncate text-theme-text-secondary"
                  title={router.fallback_model}
                >
                  {router.fallback_model}
                </TableCell>
                <TableCell className="text-theme-text-secondary">
                  {router.ruleCount || 0}
                </TableCell>
                <TableCell className="text-theme-text-secondary">
                  {router.workspaceCount || 0}
                </TableCell>
                <TableCell
                  className="text-right"
                  onClick={(event) => event.stopPropagation()}
                >
                  <TableRowActions>
                    <DropdownMenuItem
                      onClick={(event) => {
                        event.stopPropagation();
                        openRules(router);
                      }}
                    >
                      <List /> {t("model-router.table.configure-rules")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingRouter(router);
                        openModal();
                      }}
                    >
                      <Pencil /> {t("common.edit", "Edit")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={(event) => {
                        event.stopPropagation();
                        confirmDelete(router);
                      }}
                    >
                      <Trash2 /> {t("common.delete", "Delete")}
                    </DropdownMenuItem>
                  </TableRowActions>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <NewRouterModal
        isOpen={isOpen}
        closeModal={closeEditor}
        onSuccess={fetchRouters}
        router={editingRouter}
      />
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </SettingsLayout>
  );
}
