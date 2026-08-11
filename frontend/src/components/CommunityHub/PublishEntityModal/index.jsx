import { useCommunityHubAuth } from "@/hooks/useCommunityHubAuth";
import UnauthenticatedHubModal from "@/components/CommunityHub/UnauthenticatedHubModal";
import SystemPrompts from "./SystemPrompts";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import AgentFlows from "./AgentFlows";
import SlashCommands from "./SlashCommands";

export default function PublishEntityModal({
  show,
  onClose,
  entityType,
  entity,
}) {
  const { isAuthenticated, loading } = useCommunityHubAuth();
  if (!show || loading) return null;
  if (!isAuthenticated)
    return <UnauthenticatedHubModal show={show} onClose={onClose} />;

  const renderEntityForm = () => {
    switch (entityType) {
      case "system-prompt":
        return <SystemPrompts entity={entity} />;
      case "agent-flow":
        return <AgentFlows entity={entity} />;
      case "slash-command":
        return <SlashCommands entity={entity} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[900px] bg-theme-bg-primary border-theme-modal-border p-6">
        <DialogTitle className="sr-only">Publish</DialogTitle>
        {renderEntityForm()}
      </DialogContent>
    </Dialog>
  );
}
