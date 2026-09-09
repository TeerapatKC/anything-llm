import { useEffect, useState } from "react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import System from "@/models/system";
import PreLoader from "@/components/Preloader";
import { useTranslation } from "react-i18next";
import ProviderPrivacy from "@/components/ProviderPrivacy";

export default function PrivacyAndDataHandling() {
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      await System.keys();
      setLoading(false);
    }
    fetchSettings();
  }, []);

  return (
    <SettingsLayout>
      <PageHeader
        title={t("privacy.title")}
        description={t("privacy.description")}
      />
      {loading ? (
        <div className="h-1/2 transition-all duration-500 relative md:ml-[2px] md:mr-[8px] md:my-[16px] md:rounded-[26px] p-[18px] h-full overflow-y-scroll">
          <div className="w-full h-full flex justify-center items-center">
            <PreLoader />
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto flex flex-col gap-y-6 pt-6">
          <ProviderPrivacy />
        </div>
      )}
    </SettingsLayout>
  );
}
