import truncate from "truncate";
import { HubItemCardShell, HubItemDetail } from "./generic";

export default function SlashCommandHubCard({ item }) {
  return (
    <HubItemCardShell item={item}>
      <HubItemDetail label="Command">{item.command}</HubItemDetail>
      <HubItemDetail label="Prompt">{truncate(item.prompt, 90)}</HubItemDetail>
    </HubItemCardShell>
  );
}
