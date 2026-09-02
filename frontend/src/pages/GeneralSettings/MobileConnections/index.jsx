import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { QrCode } from "lucide-react";
import { useModal } from "@/hooks/useModal";
import { Button } from "@/components/ui/button";
import MobileConnection from "@/models/mobile";
import ConnectionModal from "./ConnectionModal";
import DeviceRow from "./DeviceRow";
import {
  Table,
  TableBody,
  TableEmptyRow,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function MobileDevices() {
  const { t } = useTranslation();
  const { isOpen, openModal, closeModal } = useModal();
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState([]);

  const fetchDevices = async () => {
    const foundDevices = await MobileConnection.getDevices();
    setDevices(foundDevices);
    if (foundDevices.length !== 0 && !isOpen) closeModal();
    return foundDevices;
  };

  useEffect(() => {
    fetchDevices()
      .then((devices) => {
        if (devices.length === 0) openModal();
        return devices;
      })
      .finally(() => {
        setLoading(false);
      });

    const interval = setInterval(fetchDevices, 5_000);
    return () => clearInterval(interval);
  }, []);

  const removeDevice = (id) => {
    setDevices((prevDevices) =>
      prevDevices.filter((device) => device.id !== id)
    );
  };

  return (
    <SettingsLayout shellClassName="mt-6 md:mt-0">
      <PageHeader
        title={"Connected Mobile Devices"}
        description={
          "These are the devices that are connected to your desktop application to sync chats, workspaces, and more."
        }
      />
      <div className="w-full justify-end flex">
        <Button size="lg" onClick={openModal} className="mt-3 mb-4">
          <QrCode className="h-4 w-4" /> Register New Device
        </Button>
      </div>
      <div className="overflow-x-auto mt-6">
        {loading ? (
          <Skeleton
            height="80vh"
            width="100%"
            highlightColor="var(--theme-bg-primary)"
            baseColor="var(--theme-bg-secondary)"
            count={1}
            className="w-full p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm"
            containerClassName="flex w-full"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">{t("ui.device-name")}</TableHead>
                <TableHead scope="col">Registered</TableHead>
                <TableHead scope="col"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.length === 0 ? (
                <TableEmptyRow
                  colSpan="4"
                  description={t("ui.register-device")}
                >
                  No devices connected
                </TableEmptyRow>
              ) : (
                devices.map((device) => (
                  <DeviceRow
                    key={device.id}
                    device={device}
                    removeDevice={removeDevice}
                  />
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
      <ConnectionModal isOpen={isOpen} onClose={closeModal} />
    </SettingsLayout>
  );
}
