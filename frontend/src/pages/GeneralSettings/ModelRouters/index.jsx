import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "@/components/SettingsSidebar";
import { Pencil, X } from "lucide-react";
import ModelRouter from "@/models/modelRouter";
import { useModal } from "@/hooks/useModal";
import showToast from "@/utils/toast";
import paths from "@/utils/paths";
import NewRouterModal from "./NewRouterModal";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function ModelRouters() {
  const { t } = useTranslation();
  const { isOpen, openModal, closeModal } = useModal();
  const [loading, setLoading] = useState(true);
  const [routers, setRouters] = useState([]);
  const [editingRouter, setEditingRouter] = useState(null);

  const openCreateModal = () => {
    setEditingRouter(null);
    openModal();
  };

  const openEditModal = (router) => {
    setEditingRouter(router);
    openModal();
  };

  const handleModalClose = () => {
    closeModal();
    setEditingRouter(null);
  };

  const fetchRouters = async () => {
    const results = await ModelRouter.getAll();
    setRouters(results);
    setLoading(false);
  };

  useEffect(() => {
    fetchRouters();
  }, []);

  const removeRouter = (id) => {
    setRouters((prev) => prev.filter((r) => r.id !== id));
  };

  const isEmpty = !loading && routers.length === 0;

  if (loading)
    return (
      <Layout t={t}>
        <LoadingState />
      </Layout>
    );

  if (isEmpty)
    return (
      <Layout t={t}>
        <EmptyState onCreateClick={openCreateModal} t={t} />
        <NewRouterModal
          isOpen={isOpen}
          closeModal={handleModalClose}
          onSuccess={fetchRouters}
          router={editingRouter}
        />
      </Layout>
    );

  return (
    <Layout t={t} showAction={!isEmpty} onAction={openCreateModal}>
      <RouterList
        routers={routers}
        removeRouter={removeRouter}
        openEditModal={openEditModal}
      />
      <NewRouterModal
        isOpen={isOpen}
        closeModal={handleModalClose}
        onSuccess={fetchRouters}
        router={editingRouter}
      />
    </Layout>
  );
}

function Layout({ t, showAction, onAction, children }) {
  return (
    <div className="w-screen h-screen overflow-hidden bg-zinc-950 light:bg-slate-50 flex min-[1100px]:mt-0 mt-6">
      <Sidebar />
      <div
        style={{ height: "100%" }}
        className="relative min-w-0 bg-zinc-900 light:bg-white light:border light:border-slate-300 w-full h-full overflow-y-scroll p-4 min-[1100px]:p-0"
      >
        <div className="flex flex-col w-full px-1 py-16 min-[1100px]:px-6 min-[1100px]:py-6">
          <div className="flex items-end justify-between pr-8 py-6 border-b border-white/20 light:border-slate-300">
            <div className="flex flex-col gap-y-2">
              <p className="text-lg font-semibold leading-7 text-theme-text-primary light:text-slate-900">
                {t("model-router.title")}
              </p>
              <p className="text-xs leading-4 text-zinc-400 light:text-slate-600 max-w-[700px]">
                {t("model-router.description")}
              </p>
            </div>
            {showAction && (
              <button
                onClick={onAction}
                className="border-none shrink-0 flex items-center justify-center h-9 px-5 py-2.5 rounded-lg bg-slate-50 text-zinc-950 text-sm font-medium leading-5 hover:opacity-90 transition-opacity duration-200"
              >
                {t("model-router.new-router-button")}
              </button>
            )}
          </div>

          <div className="mt-8 flex flex-col">
            <div className="grid grid-cols-[2fr_2fr_1fr_1fr_88px] gap-x-4 px-4 text-sm font-semibold uppercase tracking-[1.4px] text-zinc-500 light:text-slate-500 leading-5">
              <span>{t("model-router.table.name")}</span>
              <span>{t("model-router.table.fallback")}</span>
              <span>{t("model-router.table.rules")}</span>
              <span>{t("model-router.table.workspaces")}</span>
              <span aria-hidden="true" />
            </div>
            <div className="mt-[18px] border-t border-white/20 light:border-slate-300" />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner size="lg" className="text-zinc-400" />
    </div>
  );
}

function RouterList({ routers, removeRouter, openEditModal }) {
  return (
    <div className="flex flex-col">
      {routers.map((router, idx) => (
        <RouterRow
          key={router.id}
          router={router}
          removeRouter={removeRouter}
          onEdit={() => openEditModal(router)}
          showDivider={idx < routers.length - 1}
        />
      ))}
    </div>
  );
}

function EmptyState({ onCreateClick, t }) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-28">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-base font-semibold leading-6 text-zinc-50 light:text-slate-900">
          {t("model-router.no-routers")}
        </p>
        <p className="text-sm font-medium leading-5 text-zinc-400 light:text-slate-500 max-w-[370px]">
          {t("model-router.empty-description")}
        </p>
      </div>
      <button
        onClick={onCreateClick}
        className="border-none flex items-center justify-center h-9 px-5 py-2.5 rounded-lg bg-slate-50 text-zinc-950 text-sm font-medium leading-5 hover:opacity-90 transition-opacity duration-200"
      >
        {t("model-router.new-router-button")}
      </button>
    </div>
  );
}

function RouterRow({ router, removeRouter, onEdit, showDivider }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(null);

  const handleDelete = async (e) => {
    e.stopPropagation();
    setConfirm({
      title: t("model-router.delete-confirm", { name: router.name }),
      confirmText: t("common.delete", "Delete"),
      variant: "destructive",
      onConfirm: async () => {
        const { success, error } = await ModelRouter.delete(router.id);
        if (success) removeRouter(router.id);
        else
          showToast(t("model-router.toast-delete-failed", { error }), "error");
      },
    });
  };

  const goToRules = () => navigate(paths.settings.modelRouterRules(router.id));

  const handleEditClick = (e) => {
    e.stopPropagation();
    onEdit();
  };

  return (
    <>
      <div
        onClick={goToRules}
        className="group grid grid-cols-[2fr_2fr_1fr_1fr_88px] gap-x-4 items-center h-9 px-4 rounded-lg cursor-pointer hover:bg-white/5 light:hover:bg-slate-100 transition-colors"
      >
        <span className="text-sm font-medium leading-5 text-theme-text-primary light:text-slate-900 truncate">
          {router.name}
        </span>
        <span className="text-sm font-normal leading-5 text-zinc-400 light:text-slate-500 truncate">
          {router.fallback_provider}/{router.fallback_model}
        </span>
        <span className="text-sm font-normal leading-5 text-zinc-400 light:text-slate-500">
          {router.ruleCount || 0}
        </span>
        <span className="text-sm font-normal leading-5 text-zinc-400 light:text-slate-500">
          {router.workspaceCount || 0}
        </span>
        <div className="flex items-center justify-end gap-[14px]">
          <button
            onClick={handleEditClick}
            aria-label={t("model-router.edit-router.title", {
              name: router.name,
            })}
            className="border-none text-zinc-400 light:text-slate-500 hover:text-white light:hover:text-slate-900 transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={handleDelete}
            aria-label={t("model-router.toast-deleted")}
            className="border-none text-zinc-400 light:text-slate-500 hover:text-red-400 light:hover:text-red-500 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      {showDivider && (
        <div className="border-t border-theme-sidebar-border light:border-slate-200" />
      )}
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}
