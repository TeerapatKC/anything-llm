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
          <DialogTrigger render={<Button size="lg" className="mt-3 mb-4" />}>
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
