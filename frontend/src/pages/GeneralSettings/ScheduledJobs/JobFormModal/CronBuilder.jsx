import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  parseCronToBuilderState,
  buildCronFromBuilderState,
} from "../utils/cron";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MINUTE_INTERVALS = [1, 2, 5, 10, 15, 20, 30];
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

const pad2 = (n) => String(n).padStart(2, "0");

const inputClass =
  "border-none bg-theme-settings-input-bg text-theme-text-primary text-sm rounded-lg focus:outline-primary-button outline-none p-2.5";

const labelClass = "text-sm text-theme-text-secondary";

// Visual cron builder. Maintains its own state derived from the incoming
// `value` on mount, and emits a fresh 5-field cron string via `onChange`
// whenever the user changes any sub-field.
export default function CronBuilder({ value, onChange }) {
  const { t } = useTranslation();
  const WEEKDAYS = [
    { value: 0, label: t("scheduledJobs.builder.weekdays.sun") },
    { value: 1, label: t("scheduledJobs.builder.weekdays.mon") },
    { value: 2, label: t("scheduledJobs.builder.weekdays.tue") },
    { value: 3, label: t("scheduledJobs.builder.weekdays.wed") },
    { value: 4, label: t("scheduledJobs.builder.weekdays.thu") },
    { value: 5, label: t("scheduledJobs.builder.weekdays.fri") },
    { value: 6, label: t("scheduledJobs.builder.weekdays.sat") },
  ];
  const initial = parseCronToBuilderState(value);
  const [state, setState] = useState(initial.state);
  const [wasFallback, setWasFallback] = useState(initial.wasFallback);

  const update = (patch) => {
    const next = { ...state, ...patch };
    setState(next);
    if (wasFallback) setWasFallback(false);
    const cron = buildCronFromBuilderState(next);
    if (cron !== value) onChange(cron);
  };

  return (
    <div className="flex gap-3 p-3 bg-theme-settings-input-bg/40 rounded-lg">
      {wasFallback && (
        <p className="text-xs text-yellow-400">
          {t("scheduledJobs.builder.fallbackWarning")}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className={labelClass}>{t("scheduledJobs.builder.run")}</span>
        <Select
          value={state.frequency}
          onValueChange={(value) => update({ frequency: value })}
        >
          <SelectTrigger className={inputClass}>
            <SelectValue placeholder={t("ui.select-option")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minute">
              {t("scheduledJobs.builder.frequency.minute")}
            </SelectItem>
            <SelectItem value="hour">
              {t("scheduledJobs.builder.frequency.hour")}
            </SelectItem>
            <SelectItem value="day">
              {t("scheduledJobs.builder.frequency.day")}
            </SelectItem>
            <SelectItem value="week">
              {t("scheduledJobs.builder.frequency.week")}
            </SelectItem>
            <SelectItem value="month">
              {t("scheduledJobs.builder.frequency.month")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {state.frequency === "minute" && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className={labelClass}>{t("scheduledJobs.builder.every")}</span>
          <Select
            value={state.minuteInterval}
            onValueChange={(value) =>
              update({ minuteInterval: parseInt(value, 10) })
            }
          >
            <SelectTrigger className={inputClass}>
              <SelectValue placeholder={t("ui.select-option")} />
            </SelectTrigger>
            <SelectContent>
              {MINUTE_INTERVALS.map((n) => (
                <SelectItem key={n} value={n}>
                  {n === 1
                    ? t("scheduledJobs.builder.minuteOne")
                    : t("scheduledJobs.builder.minuteOther", { count: n })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {state.frequency === "hour" && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className={labelClass}>
            {t("scheduledJobs.builder.atMinute")}
          </span>
          <Select
            value={state.hourMinuteOffset}
            onValueChange={(value) =>
              update({ hourMinuteOffset: parseInt(value, 10) })
            }
          >
            <SelectTrigger className={inputClass}>
              <SelectValue placeholder={t("ui.select-option")} />
            </SelectTrigger>
            <SelectContent>
              {MINUTES.map((n) => (
                <SelectItem key={n} value={n}>
                  {pad2(n)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className={labelClass}>
            {t("scheduledJobs.builder.pastEveryHour")}
          </span>
        </div>
      )}

      {(state.frequency === "day" ||
        state.frequency === "week" ||
        state.frequency === "month") && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className={labelClass}>{t("scheduledJobs.builder.at")}</span>
          <input
            type="time"
            value={`${pad2(state.hour)}:${pad2(state.minute)}`}
            onChange={(e) => {
              const [h, m] = e.target.value.split(":");
              update({
                hour: parseInt(h, 10) || 0,
                minute: parseInt(m, 10) || 0,
              });
            }}
            className={`${inputClass} scheme-dark light:scheme-light`}
          />
        </div>
      )}

      {state.frequency === "week" && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className={labelClass}>{t("scheduledJobs.builder.on")}</span>
          <div className="flex gap-1 flex-wrap">
            {WEEKDAYS.map((day) => {
              const selected = state.weekdays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => {
                    const next = selected
                      ? state.weekdays.filter((d) => d !== day.value)
                      : [...state.weekdays, day.value];
                    update({ weekdays: next.length ? next : [day.value] });
                  }}
                  className={`border-none px-3 py-1 text-xs rounded-full transition-colors ${
                    selected
                      ? "bg-zinc-50 text-zinc-950 light:bg-zinc-950 light:text-white"
                      : "bg-white/5 text-theme-text-secondary hover:bg-white/10 hover:text-theme-text-primary light:bg-slate-200 light:hover:bg-slate-300"
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {state.frequency === "month" && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className={labelClass}>{t("scheduledJobs.builder.onDay")}</span>
          <Select
            value={state.dayOfMonth}
            onValueChange={(value) =>
              update({ dayOfMonth: parseInt(value, 10) })
            }
          >
            <SelectTrigger className={inputClass}>
              <SelectValue placeholder={t("ui.select-option")} />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OF_MONTH.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className={labelClass}>
            {t("scheduledJobs.builder.ofEveryMonth")}
          </span>
        </div>
      )}
    </div>
  );
}
