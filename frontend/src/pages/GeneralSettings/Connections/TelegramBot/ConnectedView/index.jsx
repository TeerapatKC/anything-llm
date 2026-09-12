import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Telegram from "@/models/telegram";
import ConnectedBotCard from "./ConnectedBotCard";
import DetailsSection from "./DetailsSection";
import UsersSection from "./UsersSection";
import DisconnectedView from "./DisconnectedView";
import CreateBotSection from "../SetupView/CreateBotSection";

export default function ConnectedView({
  config,
  onDisconnected,
  onReconnected,
}) {
  const { t } = useTranslation();
  const connected = config.connected;
  const [newToken, setNewToken] = useState("");
  const [linkedUsers, setLinkedUsers] = useState([]);

  const fetchUsers = useCallback(async () => {
    const { users } = await Telegram.getLinkedUsers();
    setLinkedUsers(users || []);
  }, []);

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 30_000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  if (!connected) {
    return (
      <div className="mt-6 grid items-start gap-6 min-[1280px]:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
        <CreateBotSection reconnect />
        <DisconnectedView
          config={config}
          onReconnected={onReconnected}
          newToken={newToken}
          setNewToken={setNewToken}
        />
      </div>
    );
  }

  return (
    <div className="mt-6 grid items-start gap-6 min-[1300px]:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <div className="min-[1300px]:col-span-2">
        <ConnectedBotCard config={config} />
      </div>
      {!config.smtp_configured && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-300 light:text-amber-700 min-[1300px]:col-span-2">
          {t("telegram.connected.smtp-warning")}
        </p>
      )}
      <DetailsSection config={config} onDisconnected={onDisconnected} />
      <UsersSection linkedUsers={linkedUsers} fetchUsers={fetchUsers} />
    </div>
  );
}
