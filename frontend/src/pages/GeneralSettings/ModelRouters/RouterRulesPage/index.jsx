import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "@/components/SettingsSidebar";
import { ArrowLeft } from "lucide-react";
import ModelRouter from "@/models/modelRouter";
import showToast from "@/utils/toast";
import paths from "@/utils/paths";
import RuleBuilder from "../RuleBuilder";

export default function RouterRulesPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [router, setRouter] = useState(null);

  const fetchRouter = async () => {
    const { router: found, error } = await ModelRouter.get(id);
    if (!found) {
      showToast(error || "Router not found", "error");
      navigate(paths.settings.modelRouters());
      return;
    }
    setRouter(found);
    setLoading(false);
  };

  useEffect(() => {
    fetchRouter();
  }, [id]);

  if (loading)
    return (
      <Layout t={t}>
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" className="text-zinc-400 light:text-slate-400" />
        </div>
      </Layout>
    );

  return (
    <Layout t={t}>
      <RuleBuilder
        routerId={router.id}
        routerName={router.name}
        rules={router.rules || []}
        onRulesChanged={fetchRouter}
      />
    </Layout>
  );
}

function Layout({ t, children }) {
  const navigate = useNavigate();

  return (
    <div className="w-screen h-screen overflow-hidden bg-zinc-950 light:bg-slate-50 flex md:mt-0 mt-6">
      <Sidebar />
      <div
        style={{ height: "100%" }}
        className="relative bg-zinc-900 light:bg-white light:border light:border-slate-300 w-full h-full overflow-y-scroll p-4 md:p-0"
      >
        <div className="flex flex-col w-full px-1 py-16 md:px-6 md:py-6">
          <button
            onClick={() => navigate(paths.settings.modelRouters())}
            className="border-none flex items-center gap-x-2 text-zinc-400 light:text-slate-500 hover:text-white light:hover:text-slate-900 text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("model-router.edit-router.back-to-routers")}
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}
