import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SMTP from "@/models/smtp";
import showToast from "@/utils/toast";

const MASKED_PASSWORD = "*".repeat(20);

const PROVIDER_KEYS = ["google", "microsoft", "outlook", "custom"];

/**
 * Outbound email (SMTP) configuration.
 *
 * Restricted to the instance owner - see the note on the `/settings/smtp` route.
 * Google and Microsoft are offered as one-click presets that lock the host/port/security
 * fields to the values those providers require; anything else falls back to a fully
 * custom SMTP server.
 */
export default function AdminSMTP() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState({});
  const [form, setForm] = useState({
    enabled: false,
    provider: "custom",
    host: "",
    port: "",
    secure: false,
    username: "",
    password: "",
    fromEmail: "",
    fromName: "",
  });
  const [hasPassword, setHasPassword] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    async function load() {
      const settings = await SMTP.settings();
      if (settings?.error) {
        showToast(settings.error, "error");
        setLoading(false);
        return;
      }

      setProviders(settings.providers || {});
      setHasPassword(!!settings.hasPassword);
      setForm({
        enabled: !!settings.enabled,
        provider: settings.provider || "custom",
        host: settings.host || "",
        port: settings.port ? String(settings.port) : "",
        secure: !!settings.secure,
        username: settings.username || "",
        password: settings.hasPassword ? MASKED_PASSWORD : "",
        fromEmail: settings.fromEmail || "",
        fromName: settings.fromName || "",
      });
      setLoading(false);
    }
    load();
  }, []);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleProviderChange(provider) {
    const preset = providers[provider];
    setForm((prev) => ({
      ...prev,
      provider,
      host: preset?.host ?? prev.host,
      port: preset?.port ? String(preset.port) : prev.port,
      secure: preset?.secure ?? prev.secure,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const { success, error, ...updated } = await SMTP.update(form);
    setSaving(false);

    if (!success) {
      showToast(error || t("smtp.save-failed"), "error");
      return;
    }

    setHasPassword(!!updated.hasPassword);
    setForm((prev) => ({
      ...prev,
      password: updated.hasPassword ? MASKED_PASSWORD : "",
    }));
    showToast(t("smtp.saved"), "success");
  }

  async function handleSendTest() {
    if (!testTo) return;
    setSendingTest(true);
    const { success, error } = await SMTP.sendTest(testTo);
    setSendingTest(false);
    showToast(
      success
        ? t("smtp.test-success", { email: testTo })
        : error || t("smtp.test-failed"),
      success ? "success" : "error"
    );
  }

  const isManagedProvider = ["google", "microsoft", "outlook"].includes(
    form.provider
  );

  return (
    <SettingsLayout>
      <PageHeader title={t("smtp.title")} description={t("smtp.description")} />

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
        <form
          onSubmit={handleSubmit}
          className="mt-6 flex max-w-2xl flex-col gap-y-6"
        >
          <div className="flex items-center gap-x-3 rounded-lg bg-muted/20 ring-1 ring-foreground/10 p-5">
            <Switch
              checked={form.enabled}
              onCheckedChange={(checked) => updateField("enabled", checked)}
              aria-label={t("smtp.enable-aria")}
            />
            <div>
              <p className="text-sm font-medium text-theme-text-primary">
                {t("smtp.enable-title")}
              </p>
              <p className="text-xs text-theme-text-secondary">
                {t("smtp.enable-description")}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-y-4 rounded-lg bg-muted/20 ring-1 ring-foreground/10 p-5">
            <div>
              <Label className="block mb-2">{t("smtp.service-label")}</Label>
              <Select
                value={form.provider}
                onValueChange={handleProviderChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("smtp.service-placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {t(`smtp.providers.${key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-theme-text-secondary">
                {t(`smtp.hints.${form.provider}`)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="host" className="block mb-2">
                  {t("smtp.host")}
                </Label>
                <Input
                  id="host"
                  value={form.host}
                  disabled={isManagedProvider}
                  onChange={(e) => updateField("host", e.target.value)}
                  placeholder={t("smtp.host-placeholder")}
                />
              </div>
              <div>
                <Label htmlFor="port" className="block mb-2">
                  {t("smtp.port")}
                </Label>
                <Input
                  id="port"
                  type="number"
                  value={form.port}
                  disabled={isManagedProvider}
                  onChange={(e) => updateField("port", e.target.value)}
                  placeholder="587"
                />
              </div>
            </div>

            <div className="flex items-center gap-x-3">
              <Switch
                checked={form.secure}
                disabled={isManagedProvider}
                onCheckedChange={(checked) => updateField("secure", checked)}
                aria-label={t("smtp.tls-aria")}
              />
              <Label className="!mb-0">{t("smtp.tls-label")}</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username" className="block mb-2">
                  {t("smtp.username")}
                </Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(e) => updateField("username", e.target.value)}
                  placeholder={t("smtp.username-placeholder")}
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="password" className="block mb-2">
                  {t("smtp.password")}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  onFocus={() =>
                    form.password === MASKED_PASSWORD &&
                    updateField("password", "")
                  }
                  placeholder={
                    hasPassword
                      ? t("smtp.password-unchanged")
                      : t("smtp.password-placeholder")
                  }
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fromEmail" className="block mb-2">
                  {t("smtp.from-email")}
                </Label>
                <Input
                  id="fromEmail"
                  value={form.fromEmail}
                  onChange={(e) => updateField("fromEmail", e.target.value)}
                  placeholder={t("smtp.from-email-placeholder")}
                />
              </div>
              <div>
                <Label htmlFor="fromName" className="block mb-2">
                  {t("smtp.from-name")}
                </Label>
                <Input
                  id="fromName"
                  value={form.fromName}
                  onChange={(e) => updateField("fromName", e.target.value)}
                  placeholder={t("smtp.from-name-placeholder")}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? t("smtp.saving") : t("smtp.save")}
            </Button>
          </div>

          <div className="flex flex-col gap-y-3 rounded-lg bg-muted/20 ring-1 ring-foreground/10 p-5">
            <Label className="block">{t("smtp.test-title")}</Label>
            <p className="text-xs text-theme-text-secondary">
              {t("smtp.test-description")}
            </p>
            <div className="flex gap-x-3">
              <Input
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder={t("smtp.test-placeholder")}
                className="max-w-xs"
              />
              <Button
                type="button"
                variant="outline"
                disabled={sendingTest || !testTo}
                onClick={handleSendTest}
              >
                {sendingTest ? t("smtp.test-sending") : t("smtp.test-send")}
              </Button>
            </div>
          </div>
        </form>
      )}
    </SettingsLayout>
  );
}
