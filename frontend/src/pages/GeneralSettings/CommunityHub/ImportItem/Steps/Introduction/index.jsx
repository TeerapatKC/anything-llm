import { Alert, AlertDescription } from "@/components/ui/alert";
import { TriangleAlert } from "lucide-react";
import CommunityHubImportItemSteps from "..";
import { Button } from "@/components/ui/button";
import paths from "@/utils/paths";
import showToast from "@/utils/toast";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function Introduction({ settings, setSettings, setStep }) {
  const [itemId, setItemId] = useState(settings.itemId);
  const handleContinue = () => {
    if (!itemId) return showToast("Please enter an item ID", "error");
    setSettings((prev) => ({ ...prev, itemId }));
    setStep(CommunityHubImportItemSteps.itemId.next());
  };

  return (
    <div className="flex-2 flex flex-col gap-y-[18px] mt-10">
      <div className="bg-theme-bg-secondary rounded-xl flex-1 p-6">
        <div className="w-full flex flex-col gap-y-2 max-w-[700px]">
          <h2 className="text-base text-theme-text-primary font-semibold">
            Import an item from the community hub
          </h2>
          <div className="flex flex-col gap-y-[25px] text-theme-text-secondary text-sm">
            <p>
              The community hub is a place where you can find, share, and import
              agent-skills, system prompts, slash commands, and more!
            </p>
            <p>
              These items are created by the NexusAI team and community, and are
              a great way to get started with NexusAI as well as extend NexusAI
              in a way that is customized to your needs.
            </p>
            <p>
              There are both <b>private</b> and <b>public</b> items in the
              community hub. Private items are only visible to you, while public
              items are visible to everyone.
            </p>

            <Alert variant="warning" className="p-4">
              <TriangleAlert />
              <AlertDescription>
                If you are pulling in a private item, make sure it is{" "}
                <b>shared with a team</b> you belong to, and you have added a{" "}
                <a
                  href={paths.communityHub.authentication()}
                  className="font-semibold underline"
                >
                  Connection Key.
                </a>
              </AlertDescription>
            </Alert>
          </div>

          <div className="flex flex-col gap-y-2 mt-4">
            <div className="w-full flex flex-col gap-y-4">
              <div className="flex flex-col w-full">
                <Label className="block mb-3">
                  Community Hub Item Import ID
                </Label>
                <Input
                  type="text"
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  placeholder="allm-community-id:agent-skill:1234567890"
                />
              </div>
            </div>
          </div>
          <Button
            size="lg"
            className="text-dark-text w-full mt-[18px] h-[34px] hover:bg-accent"
            onClick={handleContinue}
          >
            Continue with import &rarr;
          </Button>
        </div>
      </div>
    </div>
  );
}
