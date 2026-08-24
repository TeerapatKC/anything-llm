import { safeJsonParse } from "@/utils/request";
import { HubItemCardShell, HubItemDetail } from "./generic";

export default function AgentFlowHubCard({ item }) {
  const flow = safeJsonParse(item.flow, { steps: [] });
  return (
    <HubItemCardShell item={item}>
      <HubItemDetail label={`Steps (${flow.steps.length}):`}>
        <ul className="list-disc pl-4">
          {flow.steps.map((step, index) => (
            <li key={index}>{step.type}</li>
          ))}
        </ul>
      </HubItemDetail>
    </HubItemCardShell>
  );
}
