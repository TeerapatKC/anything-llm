import React, { useState, useEffect } from "react";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { Plus } from "lucide-react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import VariableRow from "./VariableRow";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import AddVariableModal from "./AddVariableModal";
import { useModal } from "@/hooks/useModal";
import {
  Table,
  TableBody,
  TableEmptyRow,
  TableHead,
  TableHeader,
  TableLoadingRow,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "react-i18next";

export default function SystemPromptVariables() {
  const { t } = useTranslation();
  const [variables, setVariables] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, openModal, closeModal } = useModal();

  useEffect(() => {
    fetchVariables();
  }, []);

  const fetchVariables = async () => {
    setLoading(true);
    try {
      const { variables } = await System.promptVariables.getAll();
      setVariables(variables || []);
    } catch (error) {
      console.error("Error fetching variables:", error);
      showToast("No variables found", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsLayout>
      <PageHeader
        title={t("settings-page.system-prompt-variables.title")}
        description={t("settings-page.system-prompt-variables.description")}
      />

      <div className="w-full justify-end flex">
        <Dialog
          open={isOpen}
          onOpenChange={(open) => (open ? openModal() : closeModal())}
        >
          <DialogTrigger
            render={
              <Button size="lg" className="mt-3 mb-4" disabled={loading} />
            }
          >
            <Plus className="h-4 w-4" /> Add Variable
          </DialogTrigger>
          <DialogContent>
            <AddVariableModal
              closeModal={closeModal}
              onRefresh={fetchVariables}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <Table className="text-left min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Key</TableHead>
              <TableHead scope="col">Value</TableHead>
              <TableHead scope="col">Description</TableHead>
              <TableHead scope="col">Type</TableHead>
              <TableHead scope="col"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableLoadingRow colSpan={5} />
            ) : variables.length === 0 ? (
              <TableEmptyRow colSpan={5}>No variables found</TableEmptyRow>
            ) : (
              variables.map((variable) => (
                <VariableRow
                  key={variable.id}
                  variable={variable}
                  onRefresh={fetchVariables}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsLayout>
  );
}
