import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import CommunityHubImportItemSteps from "../..";
import { TriangleAlert } from "lucide-react";

export default function UnknownItem({ item, setSettings, setStep }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col mt-4 gap-y-4">
      <div className="w-full flex items-center gap-x-2">
        <TriangleAlert size={24} className="text-red-500" />
        <h2 className="text-base text-red-500 font-semibold">
          Unsupported item
        </h2>
      </div>
      <div className="flex flex-col gap-y-[25px] text-white/80 text-sm">
        <p>{t("help.unknown")}</p>
        <p>
          The item ID is: <b>{item.id}</b>
          <br />
          The item type is: <b>{item.itemType}</b>
        </p>
        <p>
          Please contact support via email if you need help importing this item.
        </p>
      </div>
      <Button
        size="lg"
        className="text-dark-text w-full mt-[18px] h-[34px] hover:bg-accent"
        onClick={() => {
          setSettings({ itemId: null, item: null });
          setStep(CommunityHubImportItemSteps.itemId.key);
        }}
      >
        Try another item
      </Button>
    </div>
  );
}
