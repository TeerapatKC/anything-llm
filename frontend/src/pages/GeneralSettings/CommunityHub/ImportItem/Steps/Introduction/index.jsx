import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trans, useTranslation } from "react-i18next";
import { TriangleAlert } from "lucide-react";
import CommunityHubImportItemSteps from "..";
import { Button } from "@/components/ui/button";
import paths from "@/utils/paths";
import showToast from "@/utils/toast";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function Introduction({ settings, setSettings, setStep }) {
  const { t } = useTranslation();
  const [itemId, setItemId] = useState(settings.itemId);
  const handleContinue = () => {
    if (!itemId) return showToast(t("hub-import.enter-item-id"), "error");
    setSettings((prev) => ({ ...prev, itemId }));
    setStep(CommunityHubImportItemSteps.itemId.next());
  };

  return (
    <div className="flex-2 flex flex-col gap-y-[18px] mt-10">
      <div className="bg-theme-bg-secondary rounded-xl flex-1 p-6">
        <div className="w-full flex flex-col gap-y-2 max-w-[700px]">
          <h2 className="text-base text-theme-text-primary font-semibold">
            {t("hub-import.title")}
          </h2>
          <div className="flex flex-col gap-y-[25px] text-theme-text-secondary text-sm">
            <p>{t("hub-import.intro-1")}</p>
            <p>{t("hub-import.intro-2")}</p>
            <p>
              <Trans i18nKey="hub-import.intro-3" components={{ b: <b /> }} />
            </p>

            <Alert variant="warning" className="p-4">
              <TriangleAlert />
              <AlertDescription>
                <Trans
                  i18nKey="hub-import.warning"
                  components={{
                    b: <b />,
                    a: (
                      <a
                        href={paths.communityHub.authentication()}
                        className="font-semibold underline"
                      />
                    ),
                  }}
                />
              </AlertDescription>
            </Alert>
          </div>

          <div className="flex flex-col gap-y-2 mt-4">
            <div className="w-full flex flex-col gap-y-4">
              <div className="flex flex-col w-full">
                <Label className="block mb-3">{t("hub-import.item-id")}</Label>
                <Input
                  type="text"
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  placeholder={t("hub-import.item-id-placeholder")}
                />
              </div>
            </div>
          </div>
          <Button
            size="lg"
            className="text-dark-text w-full mt-[18px] h-[34px] hover:bg-accent"
            onClick={handleContinue}
          >
            Continue with import &rarr;
          </Button>
        </div>
      </div>
    </div>
  );
}
