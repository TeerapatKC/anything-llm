import React, { useState, useEffect } from "react";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { Plus } from "lucide-react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import CTAButton from "@/components/lib/CTAButton";
import VariableRow from "./VariableRow";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import AddVariableModal from "./AddVariableModal";
import { useModal } from "@/hooks/useModal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SystemPromptVariables() {
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
        title={"System Prompt Variables"}
        description={
          "System prompt variables are used to store configuration values that can be referenced in your system prompt to enable dynamic content in your prompts."
        }
      />

      <div className="w-full justify-end flex">
        <Dialog
          open={isOpen}
          onOpenChange={(open) => (open ? openModal() : closeModal())}
        >
          <DialogTrigger asChild>
            <CTAButton className="mt-3 mr-0 mb-4 md:-mb-6 z-10">
              <Plus className="h-4 w-4" /> Add Variable
            </CTAButton>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border">
            <AddVariableModal
              closeModal={closeModal}
              onRefresh={fetchVariables}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <Skeleton
            height="80vh"
            width="100%"
            highlightColor="var(--theme-bg-primary)"
            baseColor="var(--theme-bg-secondary)"
            count={1}
            className="w-full p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm mt-8"
            containerClassName="flex w-full"
          />
        ) : variables.length === 0 ? (
          <div className="text-center py-4 text-theme-text-secondary">
            No variables found
          </div>
        ) : (
          <Table
            variant="none"
            className="w-full text-sm text-left rounded-lg min-w-[640px] border-spacing-0"
          >
            <TableHeader variant="settings">
              <TableRow variant="none">
                <TableHead
                  variant="none"
                  scope="col"
                  className="px-4 py-2 rounded-tl-lg"
                >
                  Key
                </TableHead>
                <TableHead variant="none" scope="col" className="px-4 py-2">
                  Value
                </TableHead>
                <TableHead variant="none" scope="col" className="px-4 py-2">
                  Description
                </TableHead>
                <TableHead variant="none" scope="col" className="px-4 py-2">
                  Type
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody variant="none">
              {variables.map((variable) => (
                <VariableRow
                  key={variable.id}
                  variable={variable}
                  onRefresh={fetchVariables}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </SettingsLayout>
  );
}
