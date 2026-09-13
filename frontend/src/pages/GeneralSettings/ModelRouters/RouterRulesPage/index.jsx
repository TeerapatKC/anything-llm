import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SettingsLayout from "@/components/layout/SettingsLayout";
import { Button } from "@/components/ui/button";
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
    <SettingsLayout>
      <Button
        type="button"
        size="lg"
        variant="outline"
        onClick={() => navigate(paths.settings.modelRouters())}
        className="mb-4 w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("model-router.edit-router.back-to-routers")}
      </Button>
      {children}
    </SettingsLayout>
  );
}
