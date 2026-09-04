import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Telegram from "@/models/telegram";
import ConnectedBotCard from "./ConnectedBotCard";
import DetailsSection from "./DetailsSection";
import UsersSection from "./UsersSection";
import DisconnectedView from "./DisconnectedView";

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
      <DisconnectedView
        config={config}
        onReconnected={onReconnected}
        newToken={newToken}
        setNewToken={setNewToken}
      />
    );
  }

  return (
    <div className="flex flex-col gap-y-8 mt-8">
      <ConnectedBotCard config={config} />
      {!config.smtp_configured && (
        <p className="text-xs text-amber-500 -mt-4 max-w-[700px]">
          {t("telegram.connected.smtp-warning")}
        </p>
      )}
      <DetailsSection config={config} onDisconnected={onDisconnected} />
      <UsersSection linkedUsers={linkedUsers} fetchUsers={fetchUsers} />
    </div>
  );
}
