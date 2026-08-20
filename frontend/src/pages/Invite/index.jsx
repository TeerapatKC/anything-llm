import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FullScreenLoader } from "@/components/Preloader";
import Invite from "@/models/invite";
import NewUserModal from "./NewUserModal";
import ExistingUserForm from "./ExistingUserForm";
import { userFromStorage } from "@/utils/request";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function InvitePage() {
  const { code } = useParams();
  const [result, setResult] = useState({
    status: "loading",
    message: null,
  });

  useEffect(() => {
    async function checkInvite() {
      if (!code) {
        setResult({
          status: "invalid",
          message: "No invite code provided.",
        });
        return;
      }
      const { invite, error } = await Invite.checkInvite(code);
      setResult({
        status: invite ? "valid" : "invalid",
        message: error,
      });
    }
    checkInvite();
  }, []);

  if (result.status === "loading") {
    return (
      <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
        <FullScreenLoader />
      </div>
    );
  }

  if (result.status === "invalid") {
    return (
      <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex items-center justify-center">
        <p className="text-red-400 text-lg">{result.message}</p>
      </div>
    );
  }

  // Someone already signed in on this device almost certainly wants to use that
  // account rather than make a second one, so that tab opens first for them.
  const signedIn = !!userFromStorage()?.username;

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex items-center justify-center">
      <Dialog open={true}>
        <DialogContent showCloseButton={false} size="md">
          <DialogHeader>
            <DialogTitle>Accept your invitation</DialogTitle>
            <DialogDescription>
              Join with a new account, or add the invite's workspaces to an
              account you already have.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue={signedIn ? "existing" : "new"}>
            <TabsList className="w-full">
              <TabsTrigger value="new">Create account</TabsTrigger>
              <TabsTrigger value="existing">Use existing account</TabsTrigger>
            </TabsList>
            <TabsContent value="new" className="mt-4">
              <NewUserModal />
            </TabsContent>
            <TabsContent value="existing" className="mt-4">
              <ExistingUserForm />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
