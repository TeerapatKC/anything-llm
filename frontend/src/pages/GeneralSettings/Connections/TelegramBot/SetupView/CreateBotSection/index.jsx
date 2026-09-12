import { QRCodeSVG } from "qrcode.react";
import { TelegramLogo } from "@/components/lib/BrandIcon";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const BOTFATHER_URL = "https://t.me/BotFather";

export default function CreateBotSection({ reconnect = false }) {
  const { t } = useTranslation();
  const qrSize = 144;
  const guideKey = reconnect
    ? "telegram.setup.reconnect"
    : "telegram.setup.step1";

  return (
    <section className="min-w-0 rounded-2xl border border-white/10 bg-zinc-800/50 p-5 shadow-sm light:border-slate-200 light:bg-white sm:p-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-theme-text-primary light:text-slate-900">
          {t(`${guideKey}.title`)}
        </h2>
        <p className="text-sm leading-6 text-zinc-400 light:text-slate-600">
          <Trans
            i18nKey={`${guideKey}.description`}
            components={{
              code: (
                <code className="rounded bg-zinc-700 px-1.5 py-0.5 text-zinc-100 light:bg-slate-100 light:text-slate-900" />
              ),
            }}
          />
        </p>
      </div>
      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex shrink-0 flex-col items-start gap-3">
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <QRCodeSVG
              value={BOTFATHER_URL}
              size={qrSize}
              bgColor="#ffffff"
              fgColor="#0f172a"
              level="M"
            />
          </div>
          <Link
            to={BOTFATHER_URL}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-10 w-[168px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-zinc-700 px-3 text-sm font-medium text-white transition-colors hover:bg-zinc-600 light:border-slate-200 light:bg-slate-100 light:text-slate-900 light:hover:bg-slate-200"
          >
            <TelegramLogo className="size-5" />
            {t("telegram.setup.step1.open-botfather")}
          </Link>
        </div>
        <div className="flex min-w-0 flex-col gap-3 text-sm leading-6 text-zinc-200 light:text-slate-700">
          <p>{t("telegram.setup.step1.instruction-1")}</p>
          <p>
            <Trans
              i18nKey={`${guideKey}.instruction-2`}
              components={{
                code: (
                  <code className="rounded bg-zinc-700 px-1.5 py-0.5 light:bg-slate-100" />
                ),
              }}
            />
          </p>
          <p>{t(`${guideKey}.instruction-3`)}</p>
          <p>{t(`${guideKey}.instruction-4`)}</p>
        </div>
      </div>
      <SecurityTips />
    </section>
  );
}

function SecurityTips() {
  const { t } = useTranslation();

  return (
    <div className="mt-7 rounded-xl border border-sky-400/20 bg-sky-400/5 p-4 light:border-sky-100 light:bg-sky-50">
      <p className="mb-1 text-sm font-semibold text-theme-text-primary light:text-slate-900">
        {t("telegram.setup.security.title")}
      </p>
      <p className="mb-3 text-sm leading-5 text-zinc-400 light:text-slate-600">
        {t("telegram.setup.security.description")}
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm leading-5 text-zinc-300 light:text-slate-600">
        <li>Disable Groups {t("telegram.setup.security.disable-groups")}</li>
        <li>Disable Inline {t("telegram.setup.security.disable-inline")}</li>
        <li>{t("telegram.setup.security.obscure-username")}</li>
      </ul>
    </div>
  );
}
