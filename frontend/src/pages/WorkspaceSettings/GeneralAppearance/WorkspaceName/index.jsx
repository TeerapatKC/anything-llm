import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";

export default function WorkspaceName({ workspace, setHasChanges }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-y-[8px]">
      <div className="flex flex-col gap-y-[8px]">
        <label htmlFor="name" className="block input-label">
          {t("common.workspaces-name")}
        </label>
        <p className="text-theme-text-primary text-opacity-60 text-xs font-medium">
          {t("general.names.description")}
        </p>
      </div>
      <Input
        name="name"
        type="text"
        minLength={2}
        maxLength={80}
        defaultValue={workspace?.name}
        placeholder="My Workspace"
        required={true}
        autoComplete="off"
        onChange={() => setHasChanges(true)}
      />
    </div>
  );
}
