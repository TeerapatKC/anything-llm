import { useState, useEffect } from "react";
import { CMD_REGEX } from "./constants";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function EditPresetModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  preset,
}) {
  const [command, setCommand] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    if (preset && isOpen) {
      setCommand(preset.command?.slice(1) || "");
    }
  }, [preset, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const sanitizedCommand = command.replace(CMD_REGEX, "");
    onSave({
      id: preset.id,
      command: `/${sanitizedCommand}`,
      prompt: form.get("prompt"),
      description: form.get("description"),
    });
  };

  const handleCommandChange = (e) => {
    const value = e.target.value.replace(CMD_REGEX, "");
    setCommand(value);
  };

  const handleDelete = async () => {
    setConfirm({
      title: "Delete this preset?",
      description: "This action cannot be undone.",
      confirmText: "Delete preset",
      variant: "destructive",
      onConfirm: async () => {
        setDeleting(true);
        await onDelete(preset.id);
        setDeleting(false);
        onClose();
      },
    });
  };

  return (
    <>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Edit Preset
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-2 flex-col">
              <div className="w-full flex flex-col gap-y-4">
                <div>
                  <Label htmlFor="command" className="block mb-2">
                    Command
                  </Label>
                  <div className="flex items-center">
                    <span className="text-theme-text-primary text-sm mr-2 font-bold">
                      /
                    </span>
                    <Input
                      type="text"
                      name="command"
                      placeholder="your-command"
                      value={command}
                      onChange={handleCommandChange}
                      required={true}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="prompt" className="block mb-2">
                    Prompt
                  </Label>
                  <Textarea
                    name="prompt"
                    placeholder="This is a test prompt. Please respond with a poem about LLMs."
                    defaultValue={preset.prompt}
                    required={true}
                  ></Textarea>
                </div>
                <div>
                  <Label htmlFor="description" className="block mb-2">
                    Description
                  </Label>
                  <Input
                    type="text"
                    name="description"
                    defaultValue={preset.description}
                    placeholder="Responds with a poem about LLMs."
                    required={true}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="sm:justify-between">
              <Button
                variant="ghost"
                disabled={deleting}
                onClick={handleDelete}
                type="button"
                className="text-red-500 hover:bg-red-500/25 hover:text-red-500"
              >
                {deleting ? "Deleting..." : "Delete Preset"}
              </Button>
              <div className="flex space-x-2">
                <DialogClose
                  render={<Button variant="outline" type="button" />}
                >
                  Cancel
                </DialogClose>
                <Button variant="default" type="submit">
                  Save
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
