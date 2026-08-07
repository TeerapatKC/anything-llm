import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ModelRouter from "@/models/modelRouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function RouterPickerSelection({
  selectedRouterId,
  setSelectedRouterId,
  setHasChanges,
}) {
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
      <Select disabled>
        <SelectTrigger className="bg-zinc-900 light:bg-white text-white light:text-slate-900 text-sm rounded-lg h-8 w-full px-2.5 outline-none border border-zinc-900 light:border-slate-400 cursor-not-allowed">
          <SelectValue
            placeholder={t("model-router.router-selection.loading-routers")}
          />
        </SelectTrigger>
        <SelectContent />
      </Select>
    );
  }

  if (routers.length === 0) {
    return (
      <p className="text-xs text-zinc-400 light:text-slate-500">
        {t("model-router.router-selection.no-routers-chat")}
      </p>
    );
  }

  return (
    <Select
      value={selectedRouterId || ""}
      onValueChange={(value) => {
        setSelectedRouterId(Number(value));
        setHasChanges(true);
      }}
    >
      <SelectTrigger className="bg-zinc-900 light:bg-white text-white light:text-slate-900 text-sm rounded-lg h-8 w-full px-2.5 outline-none border border-zinc-900 light:border-slate-400 cursor-pointer">
        <SelectValue
          placeholder={t("model-router.router-selection.select-router")}
        />
      </SelectTrigger>
      <SelectContent>
        null
        {routers.map((router) => (
          <SelectItem key={router.id} value={router.id}>
            {router.name}
            {router.ruleCount != null
              ? ` ${t("model-router.router-selection.rule-count", { count: router.ruleCount })}`
              : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
