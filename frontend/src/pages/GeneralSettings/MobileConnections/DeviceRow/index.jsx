import showToast from "@/utils/toast";
import MobileConnection from "@/models/mobile";
import { useState } from "react";
import moment from "moment";
import { Bug } from "lucide-react";
import { AppleLogo } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import paths from "@/utils/paths";
import { TableCell, TableRow } from "@/components/ui/table";

export default function DeviceRow({ device, removeDevice }) {
  const [status, setStatus] = useState(device.approved);

  const handleApprove = async () => {
    await MobileConnection.updateDevice(device.id, { approved: true });
    showToast("Device access granted", "info");
    setStatus(true);
  };

  const handleDeny = async () => {
    await MobileConnection.deleteDevice(device.id);
    showToast("Device access denied", "info");
    setStatus(false);
    removeDevice(device.id);
  };

  return (
    <>
      <TableRow
        variant="none"
        className="bg-transparent text-theme-text-primary text-opacity-80 text-xs font-medium border-b border-theme-sidebar-border h-10"
      >
        <TableCell
          variant="none"
          scope="row"
          className="px-6 whitespace-nowrap"
        >
          <div className="flex items-center gap-x-2">
            {device.deviceOs === "ios" ? (
              <AppleLogo
                weight="fill"
                size={16}
                className="fill-theme-text-primary"
              />
            ) : (
              <Bug size={16} className="fill-theme-text-primary fill-current" />
            )}
            <span className="text-sm">{device.deviceName}</span>
          </div>
        </TableCell>
        <TableCell variant="none" className="px-6">
          <div className="flex items-center gap-x-2">
            {moment(device.createdAt).format("lll")}
            {device.user && (
              <div className="flex items-center gap-x-1">
                <span className="text-xs text-theme-text-secondary">by</span>
                <Link
                  to={paths.settings.users()}
                  className="text-xs text-theme-text-secondary hover:underline hover:text-cta-button"
                >
                  {device.user.username}
                </Link>
              </div>
            )}
          </div>
        </TableCell>
        <TableCell
          variant="none"
          className="px-6 flex items-center gap-x-6 h-full mt-1"
        >
          {status ? (
            <button
              onClick={handleDeny}
              className={`border-none flex items-center justify-center text-xs font-medium text-white/80 light:text-black/80 rounded-lg p-1 hover:bg-white hover:light:bg-red-50 hover:bg-opacity-10`}
            >
              Revoke
            </button>
          ) : (
            <>
              <button
                onClick={handleApprove}
                className={`border-none flex items-center justify-center text-xs font-medium text-white/80 light:text-black/80 rounded-lg p-1 hover:bg-white hover:bg-opacity-10 hover:light:bg-green-50 hover:light:text-green-500 hover:text-green-300`}
              >
                Approve Access
              </button>
              <button
                onClick={handleDeny}
                className={`border-none flex items-center justify-center text-xs font-medium text-white/80 light:text-black/80 rounded-lg p-1 hover:bg-white hover:bg-opacity-10 hover:light:bg-red-50 hover:light:text-red-500 hover:text-red-300`}
              >
                Deny
              </button>
            </>
          )}
        </TableCell>
      </TableRow>
    </>
  );
}
