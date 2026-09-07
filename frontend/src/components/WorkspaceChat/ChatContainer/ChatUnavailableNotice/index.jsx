import { Ban } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Stands in for the prompt input whenever the server would refuse the chat anyway.
 * Replaced rather than merely disabled - a greyed-out input invites people to keep
 * trying at something that cannot succeed.
 * @param {{message: string}} props
 */
export default function ChatUnavailableNotice({ message }) {
  return (
    <div className="w-full flex justify-center px-4 pb-6">
      <Alert className="w-full items-center px-4 py-3 md:max-w-[800px]">
        <Ban />
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
}
