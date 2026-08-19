import { useState } from "react";
import { CMD_REGEX } from "./constants";
import { useTranslation } from "react-i18next";
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

export default function AddPresetModal({ isOpen, onClose, onSave }) {
  const [command, setCommand] = useState("");
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const sanitizedCommand = command.replace(CMD_REGEX, "");
    const saved = await onSave({
      command: `/${sanitizedCommand}`,
      prompt: form.get("prompt"),
      description: form.get("description"),
    });
    if (saved) setCommand("");
  };

  const handleCommandChange = (e) => {
    const value = e.target.value.replace(CMD_REGEX, "");
    setCommand(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            {t("chat_window.add_new_preset")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-2 flex-col">
            <div className="w-full flex flex-col gap-y-4">
              <div>
                <Label htmlFor="command" className="block mb-2">
                  {t("chat_window.command")}
                </Label>
                <div className="flex items-center">
                  <span className="text-theme-text-primary text-sm mr-2 font-bold">
                    /
                  </span>
                  <Input
                    name="command"
                    type="text"
                    id="command"
                    placeholder={t("chat_window.your_command")}
                    value={command}
                    onChange={handleCommandChange}
                    maxLength={25}
                    autoComplete="off"
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
                  id="prompt"
                  autoComplete="off"
                  placeholder={t("chat_window.placeholder_prompt")}
                  required={true}
                ></Textarea>
              </div>
              <div>
                <Label htmlFor="description" className="block mb-2">
                  {t("chat_window.description")}
                </Label>
                <Input
                  type="text"
                  name="description"
                  id="description"
                  placeholder={t("chat_window.placeholder_description")}
                  maxLength={80}
                  autoComplete="off"
                  required={true}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              {t("chat_window.cancel")}
            </DialogClose>
            <Button variant="default" type="submit">
              {t("chat_window.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
