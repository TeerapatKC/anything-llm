import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
// #TEMPORARILY_HIDDEN: Uncomment when restoring Sidebar Footer Items.
// import FooterCustomization from "../components/FooterCustomization";
import SupportEmail from "../components/SupportEmail";
import CustomLogo from "../components/CustomLogo";
import { useTranslation } from "react-i18next";
import CustomAppName from "../components/CustomAppName";
import CustomSiteSettings from "../components/CustomSiteSettings";

export default function BrandingSettings() {
  const { t } = useTranslation();

  return (
    <SettingsLayout>
      <PageHeader
        title={t("customization.branding.title")}
        description={t("customization.branding.description")}
      />
      <CustomAppName />
      <CustomLogo />
      {/* #TEMPORARILY_HIDDEN: Uncomment to restore Sidebar Footer Items.
      <FooterCustomization />
      */}
      <SupportEmail />
      <CustomSiteSettings />
    </SettingsLayout>
  );
}
