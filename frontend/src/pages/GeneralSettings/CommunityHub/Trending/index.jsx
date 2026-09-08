import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import HubItems from "./HubItems";
import { useTranslation } from "react-i18next";

export default function CommunityHub() {
  const { t } = useTranslation();
  return (
    <SettingsLayout>
      <PageHeader
        title={t("settings-page.community-hub.title")}
        description={t("settings-page.community-hub.trending-description")}
      />
      <HubItems />
    </SettingsLayout>
  );
}
