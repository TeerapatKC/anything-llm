import showToast from "@/utils/toast";
import MobileConnection from "@/models/mobile";
import { useState } from "react";
import moment from "moment";
import { Bug } from "lucide-react";
import { AppleLogo } from "@/components/lib/BrandIcon";
import { Link } from "react-router-dom";
import paths from "@/utils/paths";
import { TableCell, TableRow } from "@/components/ui/table";
import TableRowActions from "@/components/lib/TableRowActions";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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
      <TableRow>
        <TableCell scope="row">
          <div className="flex items-center gap-x-2">
            {device.deviceOs === "ios" ? (
              <AppleLogo size={16} className="fill-theme-text-primary" />
            ) : (
              <Bug size={16} className="fill-theme-text-primary fill-current" />
            )}
            <span className="text-sm">{device.deviceName}</span>
          </div>
        </TableCell>
        <TableCell>
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
        <TableCell className="text-right">
          <TableRowActions>
            {status ? (
              <DropdownMenuItem variant="destructive" onClick={handleDeny}>
                Revoke
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem onClick={handleApprove}>
                  Approve access
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleDeny}>
                  Deny
                </DropdownMenuItem>
              </>
            )}
          </TableRowActions>
        </TableCell>
      </TableRow>
    </>
  );
}
