import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { useTranslation } from "react-i18next";
import AutoSubmit from "../components/AutoSubmit";
import AutoSpeak from "../components/AutoSpeak";
import SpellCheck from "../components/SpellCheck";
import ShowScrollbar from "../components/ShowScrollbar";
import AutoScroll from "../components/AutoScroll";
import ChatRenderHTML from "../components/ChatRenderHTML";

export default function ChatSettings() {
  const { t } = useTranslation();

  return (
    <SettingsLayout>
      <PageHeader
        title={t("customization.chat.title")}
        description={t("customization.chat.description")}
      />
      <AutoSubmit />
      <AutoSpeak />
      <SpellCheck />
      <ShowScrollbar />
      <AutoScroll />
      <ChatRenderHTML />
    </SettingsLayout>
  );
}
