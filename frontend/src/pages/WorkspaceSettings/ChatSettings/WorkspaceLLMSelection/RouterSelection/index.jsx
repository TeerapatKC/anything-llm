import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import paths from "@/utils/paths";
import ModelRouter from "@/models/modelRouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function RouterSelection({ workspace, setHasChanges }) {
  const { t } = useTranslation();
  const [routers, setRouters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRouters() {
      const results = await ModelRouter.getAll();
      setRouters(results);
      setLoading(false);
    }
    fetchRouters();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-y-[8px]">
        <p className="text-sm/60 text-theme-text-primary">
          {t("model-router.router-selection.loading-routers")}
        </p>
      </div>
    );
  }

  if (routers.length === 0) {
    return (
      <div className="flex flex-col gap-y-[8px]">
        <p className="text-sm/60 text-theme-text-primary">
          {t("model-router.router-selection.no-routers-prefix-workspace")}{" "}
          <Link
            to={paths.settings.modelRouters()}
            className="underline text-theme-text-primary"
          >
            {t("model-router.router-selection.no-routers-link")}
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-[8px]">
      <label className="block input-label">
        {t("model-router.router-selection.model-router-label")}
      </label>
      <p className="text-theme-text-primary/60 text-xs font-medium">
        {t("model-router.router-selection.select-description")}
      </p>
      <Select
        name="router_id"
        // The old `<option value="">` prompt row becomes the placeholder, since
        // Radix has no empty-string item value.
        defaultValue={workspace?.router_id || undefined}
        onValueChange={() => setHasChanges(true)}
        required
      >
        <SelectTrigger className="max-w-[640px]">
          <SelectValue
            placeholder={t("model-router.router-selection.select-router")}
          />
        </SelectTrigger>
        <SelectContent>
          {routers.map((router) => (
            <SelectItem key={router.id} value={router.id}>
              {router.name}
              {router.description ? ` — ${router.description}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
