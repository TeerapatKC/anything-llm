import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import HubItems from "./HubItems";

export default function CommunityHub() {
  return (
    <SettingsLayout>
      <PageHeader
        title={"Community Hub"}
        description={"Share and collaborate with the NexusAI community."}
      />
      <HubItems />
    </SettingsLayout>
  );
}
