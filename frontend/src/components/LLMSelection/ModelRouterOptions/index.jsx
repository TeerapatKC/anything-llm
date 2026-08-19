import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import paths from "@/utils/paths";
import ModelRouter from "@/models/modelRouter";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ModelRouterOptions({ settings }) {
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
      <div className="w-full flex flex-col gap-y-4">
        <p className="text-sm/60 text-theme-text-primary">
          {t("model-router.router-selection.loading-routers")}
        </p>
      </div>
    );
  }

  if (routers.length === 0) {
    return (
      <div className="w-full flex flex-col gap-y-4">
        <p className="text-sm/60 text-theme-text-primary">
          {t("model-router.router-selection.no-routers-prefix-settings")}{" "}
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
    <div className="w-full flex flex-col gap-y-4">
      <div className="w-full flex items-center gap-[36px]">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">
            {t("model-router.router-selection.model-router-label")}
          </Label>
          <Select
            name="ModelRouterId"
            // The old `<option value="">` prompt row becomes the trigger
            // placeholder, since Radix has no empty-string value.
            defaultValue={settings?.ModelRouterId || undefined}
            required
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={t("model-router.router-selection.select-router")}
              />
            </SelectTrigger>
            <SelectContent>
              {routers.map((router) => (
                <SelectItem key={router.id} value={router.id}>
                  {router.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
