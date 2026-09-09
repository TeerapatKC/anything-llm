import React from "react";
import UserButton from "../UserMenu/UserButton";

export default function Footer() {
  return (
    <div className="flex flex-col gap-y-2 w-full">
      {/* Settings lives in its dropdown menu now, rather than as its own
          footer icon — see UserButton. It collapses to just the avatar on
          its own when a `Sidebar` ancestor is icon-only. */}
      <UserButton />
    </div>
  );
}
