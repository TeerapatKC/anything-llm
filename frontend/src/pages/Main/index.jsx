import React from "react";
import PasswordModal, { usePasswordModal } from "@/components/Modals/Password";
import { FullScreenLoader } from "@/components/Preloader";
import Home from "./Home";
import Sidebar, { SidebarPageLayout } from "@/components/Sidebar";

export default function Main() {
  const { loading, requiresAuth } = usePasswordModal();

  if (loading) return <FullScreenLoader />;
  if (requiresAuth !== false)
    return <>{requiresAuth !== null && <PasswordModal />}</>;

  return (
    <SidebarPageLayout>
      <Sidebar />
      <Home />
    </SidebarPageLayout>
  );
}
