import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useTranslation } from "react-i18next";
import ModelRouterAPI from "@/models/modelRouter";
import showToast from "@/utils/toast";
import LLMProviderModelPicker from "../../LLMProviderModelPicker";
import CalculatedFields from "./CalculatedFields";
import LLMDescriptionField from "./LLMDescriptionField";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

function createRuleTypes(t) {
  return [
    {
      value: "calculated",
      label: t("model-router.rule-form.type-calculated-label"),
      description: t("model-router.rule-form.type-calculated-description"),
    },
    {
      value: "llm",
      label: t("model-router.rule-form.type-llm-label"),
      description: t("model-router.rule-form.type-llm-description"),
    },
  ];
}

function emptyCondition() {
  return { property: "", comparator: "", value: "" };
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export default function RuleForm({
  isOpen,
  closeModal,
  routerId,
  existingRule = null,
  nextPriority,
  onSaved,
}) {
  const { t } = useTranslation();
  const ruleTypes = createRuleTypes(t);
  const isEditing = !!existingRule;
  const [loading, setLoading] = useState(false);
  const [ruleType, setRuleType] = useState(existingRule?.type || "calculated");
  const [conditionLogic, setConditionLogic] = useState(
    existingRule?.condition_logic || "AND"
  );
  const [conditions, setConditions] = useState(
    Array.isArray(existingRule?.conditions) && existingRule.conditions.length
      ? existingRule.conditions
      : [emptyCondition()]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    const title = slugify(formData.get("title") || "");

    if (!title) {
      showToast(t("model-router.rule-form.title-required"), "error");
      setLoading(false);
      return;
    }

    const data = {
      title,
      type: ruleType,
      route_provider: formData.get("route_provider"),
      route_model: formData.get("route_model"),
      priority: isEditing ? existingRule.priority : Number(nextPriority),
    };

    if (ruleType === "calculated") {
      const incomplete = conditions.findIndex(
        (c) => !c.property || !c.comparator || !String(c.value ?? "").trim()
      );
      if (incomplete !== -1) {
        showToast(
          t("model-router.rule-form.conditions-incomplete", {
            index: incomplete + 1,
          }),
          "error"
        );
        setLoading(false);
        return;
      }
      data.condition_logic = conditionLogic;
      data.conditions = conditions;
      data.description = null;
    } else if (ruleType === "llm") {
      data.description = formData.get("description");
      data.condition_logic = null;
      data.conditions = null;
    }

    let result;
    if (isEditing) {
      result = await ModelRouterAPI.updateRule(routerId, existingRule.id, data);
    } else {
      result = await ModelRouterAPI.createRule(routerId, data);
    }

    setLoading(false);
    if (result.rule) {
      onSaved();
      closeModal();
    } else {
      showToast(
        result.error || t("model-router.rule-form.toast-save-failed"),
        "error"
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent size="xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-y-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {t("model-router.rules.title")}
            </DialogTitle>
            <p className="text-xs leading-4 text-zinc-400 light:text-slate-600">
              {t("model-router.rules.description")}
            </p>
          </DialogHeader>

          <div className="flex flex-col gap-y-5">
            <div className="flex gap-x-5 items-start">
              <div className="flex flex-col gap-y-1.5 w-[500px]">
                <label className="text-sm font-medium leading-5 text-theme-text-primary light:text-slate-950">
                  {t("model-router.rule-form.title-label")}
                </label>
                <input
                  type="text"
                  name="title"
                  defaultValue={existingRule?.title || ""}
                  placeholder="e.g. route_code_to_claude"
                  className="bg-zinc-800 light:bg-white light:border light:border-slate-300 text-theme-text-primary light:text-slate-700 placeholder:text-zinc-400 light:placeholder:text-slate-400 text-sm rounded-[8px] outline-none block w-full h-8 px-3.5 font-mono"
                  required
                />
              </div>
              <div className="flex flex-col gap-y-1.5 w-[300px]">
                <label className="text-sm font-medium leading-5 text-theme-text-primary light:text-slate-950">
                  {t("model-router.rule-form.rule-type")}
                </label>
                <Select value={ruleType} onValueChange={setRuleType}>
                  <SelectTrigger className="bg-zinc-800 light:bg-white light:border light:border-slate-300 text-theme-text-primary light:text-slate-700 text-sm rounded-[8px] outline-none w-full h-8 px-3.5">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {ruleTypes.map((rt) => (
                      <SelectItem key={rt.value} value={rt.value}>
                        {rt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs leading-4 text-zinc-400 light:text-slate-600">
                  {ruleTypes.find((rt) => rt.value === ruleType)?.description}
                </p>
              </div>
            </div>

            {ruleType === "calculated" ? (
              <CalculatedFields
                conditionLogic={conditionLogic}
                setConditionLogic={setConditionLogic}
                conditions={conditions}
                setConditions={setConditions}
              />
            ) : (
              <LLMDescriptionField existingRule={existingRule} />
            )}

            <LLMProviderModelPicker
              providerFieldName="route_provider"
              modelFieldName="route_model"
              label={t("model-router.rule-form.route-to-label")}
              description={t("model-router.rule-form.route-to-description")}
              defaultProvider={existingRule?.route_provider || ""}
              defaultModel={existingRule?.route_model || ""}
            />
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              {t("model-router.rule-form.cancel")}
            </DialogClose>
            <Button variant="default" type="submit" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-x-1.5">
                  <Spinner size="sm" />
                  {t("model-router.rule-form.saving")}
                </span>
              ) : isEditing ? (
                t("model-router.rule-form.update-rule")
              ) : (
                t("model-router.rule-form.create-rule")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
