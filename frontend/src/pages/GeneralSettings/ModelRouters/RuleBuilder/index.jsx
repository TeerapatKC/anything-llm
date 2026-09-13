import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import ModelRouterAPI from "@/models/modelRouter";
import { useModal } from "@/hooks/useModal";
import showToast from "@/utils/toast";
import RuleForm from "./RuleForm";
import RuleRow from "./RuleRow";
import ConfirmDialog from "@/components/ConfirmDialog";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";

function RulesList({
  rules,
  editingRule,
  onEdit,
  onDelete,
  onToggle,
  onDragEnd,
}) {
  const { t } = useTranslation();
  const calculatedRules = rules.filter((r) => r.type === "calculated");
  const llmRules = rules.filter((r) => r.type === "llm");

  return (
    <div className="mt-6 flex flex-col gap-y-6">
      {calculatedRules.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 light:text-slate-400 mb-2">
            {t("model-router.rules.calculated-section-label")}
          </p>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="calculated-rules">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex flex-col gap-y-2"
                >
                  {calculatedRules.map((rule, index) => (
                    <Draggable
                      key={rule.id}
                      draggableId={rule.id.toString()}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={snapshot.isDragging ? "opacity-60" : ""}
                        >
                          <RuleRow
                            rule={rule}
                            isEditing={editingRule?.id === rule.id}
                            onEdit={() => onEdit(rule)}
                            onDelete={() => onDelete(rule)}
                            onToggle={() => onToggle(rule)}
                            dragHandleProps={provided.dragHandleProps}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}

      {llmRules.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 light:text-slate-400 mb-2">
            {t("model-router.rules.llm-section-label")}
          </p>
          <div className="flex flex-col gap-y-2">
            {llmRules.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                isEditing={editingRule?.id === rule.id}
                onEdit={() => onEdit(rule)}
                onDelete={() => onDelete(rule)}
                onToggle={() => onToggle(rule)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyRulesState({ onCreateRule }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-lg border border-theme-sidebar-border py-20">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-base font-semibold leading-6 text-zinc-50 light:text-slate-900">
          {t("model-router.rules.no-rules")}
        </p>
        <p className="text-sm font-medium leading-5 text-zinc-400 light:text-slate-500 max-w-[370px]">
          {t("model-router.rules.empty-description")}
        </p>
      </div>
      <Button onClick={onCreateRule} size="lg">
        {t("model-router.rules.new-rule-button")}
      </Button>
    </div>
  );
}

export default function RuleBuilder({
  routerId,
  routerName,
  rules,
  onRulesChanged,
}) {
  const { t } = useTranslation();
  const { isOpen, openModal, closeModal } = useModal();
  const [editingRule, setEditingRule] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const openCreate = () => {
    setEditingRule(null);
    openModal();
  };

  const openEdit = (rule) => {
    setEditingRule(rule);
    openModal();
  };

  const handleModalClose = () => {
    closeModal();
    setEditingRule(null);
  };

  const handleDelete = async (rule) => {
    setConfirm({
      title: t("model-router.rules.delete-confirm", { title: rule.title }),
      confirmText: t("common.delete", "Delete"),
      variant: "destructive",
      onConfirm: async () => {
        const { success } = await ModelRouterAPI.deleteRule(routerId, rule.id);
        if (success) onRulesChanged();
        else showToast(t("model-router.rules.toast-delete-failed"), "error");
      },
    });
  };

  const handleToggle = async (rule) => {
    const { rule: updated } = await ModelRouterAPI.updateRule(
      routerId,
      rule.id,
      { enabled: !rule.enabled }
    );
    if (updated) onRulesChanged();
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const calcRules = rules.filter((r) => r.type === "calculated");
    const llmRules = rules.filter((r) => r.type === "llm");
    const reordered = Array.from(calcRules);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    // Calculated rules get priorities 1..N, LLM rules get N+1..M
    const ruleUpdates = [
      ...reordered.map((rule, index) => ({
        id: rule.id,
        priority: index + 1,
      })),
      ...llmRules.map((rule, index) => ({
        id: rule.id,
        priority: reordered.length + index + 1,
      })),
    ];

    const { success } = await ModelRouterAPI.reorderRules(
      routerId,
      ruleUpdates
    );
    if (success) onRulesChanged();
    else showToast(t("model-router.rules.toast-reorder-failed"), "error");
  };

  const hasRules = rules && rules.length > 0;

  return (
    <div>
      <PageHeader
        title={
          routerName
            ? t("model-router.rules.title-with-name", { name: routerName })
            : t("model-router.rules.title")
        }
        description={t("model-router.rules.description")}
        actions={
          hasRules ? (
            <Button onClick={openCreate} size="lg">
              {t("model-router.rules.add-rule")}
            </Button>
          ) : null
        }
      />

      {hasRules ? (
        <RulesList
          rules={rules}
          editingRule={editingRule}
          onEdit={openEdit}
          onDelete={handleDelete}
          onToggle={handleToggle}
          onDragEnd={onDragEnd}
        />
      ) : (
        <EmptyRulesState onCreateRule={openCreate} />
      )}

      {isOpen && (
        <RuleForm
          key={editingRule?.id ?? "new"}
          isOpen={isOpen}
          closeModal={handleModalClose}
          routerId={routerId}
          existingRule={editingRule}
          nextPriority={(rules?.length || 0) + 1}
          onSaved={onRulesChanged}
        />
      )}
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
