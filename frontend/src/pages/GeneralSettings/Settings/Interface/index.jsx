import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { useTranslation } from "react-i18next";
import LanguagePreference from "../components/LanguagePreference";
import ThemePreference from "../components/ThemePreference";

export default function InterfaceSettings() {
  const { t } = useTranslation();

  return (
    <SettingsLayout>
      <PageHeader
        title={t("customization.interface.title")}
        description={t("customization.interface.description")}
      />
      <ThemePreference />
      <LanguagePreference />
    </SettingsLayout>
  );
}
