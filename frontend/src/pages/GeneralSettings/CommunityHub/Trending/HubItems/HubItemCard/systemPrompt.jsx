import truncate from "truncate";
import { HubItemCardShell, HubItemDetail } from "./generic";

export default function SystemPromptHubCard({ item }) {
  return (
    <HubItemCardShell item={item}>
      <HubItemDetail label="Prompt">{truncate(item.prompt, 90)}</HubItemDetail>
    </HubItemCardShell>
  );
}
