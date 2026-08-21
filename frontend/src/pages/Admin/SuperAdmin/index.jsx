import { useEffect, useState } from "react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import SuperAdmin from "@/models/superAdmin";
import TransferOwnership from "./TransferOwnership";
import ResetInstance from "./ResetInstance";

/**
 * The owner-only console.
 *
 * Everything here is gated on holding the `super-admin` role rather than on a
 * permission, so this screen is unreachable for every other account no matter what
 * their role grants - including other administrators.
 */
export default function AdminSuperAdmin() {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState(null);

  async function reload() {
    setState(await SuperAdmin.state());
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <SettingsLayout>
      <PageHeader
        title={"Instance Owner"}
        description={
          "You hold the super admin role for this deployment. It cannot be deleted, suspended or handed out — it moves only through the transfer below. The operations on this page are irreversible and available to nobody else."
        }
      />

      {loading ? (
        <Skeleton
          height="50vh"
          width="100%"
          highlightColor="var(--theme-bg-primary)"
          baseColor="var(--theme-bg-secondary)"
          count={1}
          className="w-full p-4 rounded-2xl mt-8"
          containerClassName="flex w-full"
        />
      ) : (
        <>
          <OwnerCard owner={state?.owner} capabilities={state?.capabilities} />

          <Tabs defaultValue="ownership" className="mt-6">
            <TabsList>
              <TabsTrigger value="ownership">Transfer ownership</TabsTrigger>
              <TabsTrigger value="reset">Reset & cleanup</TabsTrigger>
            </TabsList>
            <TabsContent value="ownership">
              <TransferOwnership
                candidates={state?.transferCandidates ?? []}
                onTransferred={reload}
              />
            </TabsContent>
            <TabsContent value="reset">
              <ResetInstance />
            </TabsContent>
          </Tabs>
        </>
      )}
    </SettingsLayout>
  );
}

/** Who owns the instance today, and what owning it actually means. */
function OwnerCard({ owner, capabilities = [] }) {
  return (
    <div className="mt-6 rounded-lg border border-theme-sidebar-border bg-muted/20 p-5">
      <div className="flex items-center gap-x-3">
        <Crown className="h-5 w-5 text-yellow-400 light:text-yellow-600" />
        <div>
          <div className="flex items-center gap-x-2">
            <span className="text-theme-text-primary font-medium">
              {owner?.username ?? "Nobody"}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              Super Admin
            </Badge>
          </div>
          <p className="text-xs text-theme-text-secondary mt-0.5">
            {owner?.email || "No email on file"}
          </p>
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-y-2 border-t border-theme-sidebar-border pt-4">
        {capabilities.map((capability) => (
          <li key={capability.key}>
            <span className="text-sm text-theme-text-primary block">
              {capability.label}
            </span>
            <span className="text-xs text-theme-text-secondary block">
              {capability.description}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
