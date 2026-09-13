import { Trans, useTranslation } from "react-i18next";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import truncate from "truncate";

const COMPARATOR_SYMBOLS = {
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  eq: "=",
  neq: "!=",
};

function createComparatorLabels(t) {
  return {
    contains: t("model-router.rules.comparator-contains"),
    matches: t("model-router.rules.comparator-matches"),
    between: t("model-router.rules.comparator-between"),
    ...COMPARATOR_SYMBOLS,
  };
}

function getComparatorLabel(t, comparator) {
  const labels = createComparatorLabels(t);
  return labels[comparator] || comparator;
}

export default function RuleRow({
  rule,
  isEditing,
  onEdit,
  onDelete,
  onToggle,
  dragHandleProps,
}) {
  const { t } = useTranslation();
  const isDisabled = !rule.enabled;

  return (
    <div
      className={`group flex flex-wrap items-center gap-3 rounded-lg border border-theme-sidebar-border bg-theme-bg-secondary px-3 py-3 transition-colors ${
        isEditing ? "ring-1 ring-blue-500/60" : ""
      } ${isDisabled ? "opacity-50" : ""}`}
    >
      {dragHandleProps ? (
        <div
          {...dragHandleProps}
          className="cursor-grab shrink-0 text-zinc-400 light:text-slate-500 hover:text-white light:hover:text-slate-700 transition-colors"
          aria-label={t("model-router.rules.aria-drag-to-reorder")}
        >
          <GripVertical size={24} />
        </div>
      ) : (
        <div className="shrink-0 w-6" />
      )}
      {dragHandleProps && (
        <p className="shrink-0 text-sm font-semibold text-zinc-400 light:text-slate-500 tabular-nums">
          #{rule.priority}
        </p>
      )}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium leading-5 text-theme-text-primary light:text-slate-900 truncate">
            {rule.title}
          </span>
          <Badge variant="outline">
            {rule.type === "llm"
              ? t("model-router.rules.badge-llm")
              : t("model-router.rules.badge-calculated")}
          </Badge>
        </div>
        {rule.type === "llm" ? (
          <LLMRuleBody rule={rule} />
        ) : (
          <CalculatedRuleBody rule={rule} />
        )}
      </div>
      <div className="flex items-center gap-x-3 shrink-0">
        <Switch
          checked={rule.enabled}
          onCheckedChange={onToggle}
          aria-label={rule.title}
        />
        <button
          onClick={onEdit}
          className="border-none text-zinc-400 light:text-slate-500 hover:text-white light:hover:text-slate-900 transition-colors"
          aria-label={t("model-router.rules.aria-edit-rule")}
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={onDelete}
          className="border-none text-zinc-400 light:text-slate-500 hover:text-red-400 light:hover:text-red-500 transition-colors"
          aria-label={t("model-router.rules.aria-delete-rule")}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function LLMRuleBody({ rule }) {
  return (
    <p className="text-sm font-medium leading-5 text-zinc-400 light:text-slate-500 truncate">
      <Trans
        i18nKey="model-router.rules.llm-rule-body"
        values={{
          description: truncate(rule.description, 100),
          route: rule.route_model,
        }}
        components={{
          desc: (
            <span className="font-mono text-fuchsia-400 light:text-fuchsia-500" />
          ),
          route: <span className="text-zinc-200 light:text-slate-700" />,
        }}
      />
    </p>
  );
}

function CalculatedRuleBody({ rule }) {
  const { t } = useTranslation();
  const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
  const route = rule.route_model;

  if (conditions.length === 0) {
    return (
      <p className="text-sm font-medium leading-5 text-zinc-400 light:text-slate-500 truncate">
        <Trans
          i18nKey="model-router.rules.calculated-no-conditions"
          values={{ route }}
          components={{
            route: <span className="text-zinc-200 light:text-slate-700" />,
          }}
        />
      </p>
    );
  }

  if (conditions.length === 1) {
    const c = conditions[0];
    return (
      <p className="text-sm font-medium leading-5 text-zinc-400 light:text-slate-500 truncate">
        <Trans
          i18nKey="model-router.rules.calculated-single-condition"
          values={{
            property: c.property,
            comparator: getComparatorLabel(t, c.comparator),
            value: c.value,
            route,
          }}
          components={{
            prop: (
              <span className="font-mono text-blue-400 light:text-blue-500" />
            ),
            val: (
              <span className="font-mono text-blue-400 light:text-blue-500" />
            ),
            route: <span className="text-zinc-200 light:text-slate-700" />,
          }}
        />
      </p>
    );
  }

  const quantifier = rule.condition_logic === "OR" ? "any" : "all";
  const conditionsSummary = conditions
    .map(
      (c) => `${c.property} ${getComparatorLabel(t, c.comparator)} "${c.value}"`
    )
    .join(" AND ");

  return (
    <p className="text-sm font-medium leading-5 text-zinc-400 light:text-slate-500 truncate">
      <Trans
        i18nKey="model-router.rules.calculated-multi-condition"
        values={{
          quantifier: t(`model-router.rules.quantifier-${quantifier}`),
          conditions: truncate(conditionsSummary, 100),
          route,
        }}
        components={{
          cond: (
            <span className="font-mono text-blue-400 light:text-blue-500" />
          ),
          route: <span className="text-zinc-200 light:text-slate-700" />,
        }}
      />
    </p>
  );
}
