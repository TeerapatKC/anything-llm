import React from "react";
import PasswordModal, { usePasswordModal } from "@/components/Modals/Password";
import { FullScreenLoader } from "@/components/Preloader";
import Home from "./Home";
import { isMobile } from "react-device-detect";
import Sidebar, {
  SidebarMobileHeader,
  SidebarPageLayout,
} from "@/components/Sidebar";

export default function Main() {
  const { loading, requiresAuth, mode } = usePasswordModal();

  if (loading) return <FullScreenLoader />;
  if (requiresAuth !== false)
    return <>{requiresAuth !== null && <PasswordModal mode={mode} />}</>;

  return (
    <SidebarPageLayout>
      {!isMobile ? <Sidebar /> : <SidebarMobileHeader />}
      <Home />
    </SidebarPageLayout>
  );
}
