import pluralize from "pluralize";
import { HubItemCardShell } from "./generic";

export default function AgentSkillHubCard({ item }) {
  return (
    <HubItemCardShell item={item}>
      <p className="font-mono text-xs text-muted-foreground">
        {item.verified ? (
          <span className="text-green-500">Verified</span>
        ) : (
          <span className="text-red-500">Unverified</span>
        )}{" "}
        Skill
      </p>
      <p className="font-mono text-xs text-muted-foreground">
        {item.manifest.files?.length || 0}{" "}
        {pluralize("file", item.manifest.files?.length || 0)} found
      </p>
    </HubItemCardShell>
  );
}
