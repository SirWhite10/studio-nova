export type JobScheduleFrequency = "every_minutes" | "hourly" | "daily" | "weekly";

export type JobScheduleInput = {
  frequency: JobScheduleFrequency;
  intervalMinutes?: number | null;
  timeOfDay?: string | null;
  weekday?: number | null;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeIntervalMinutes(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 5;
  return clamp(Math.round(parsed), 5, 1440);
}

export function normalizeWeekday(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return clamp(Math.round(parsed), 0, 6);
}

export function normalizeTimeOfDay(value: unknown) {
  if (typeof value !== "string") return "09:00";
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return "09:00";
  const hour = clamp(Number(match[1]), 0, 23);
  const minute = clamp(Number(match[2]), 0, 59);
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function formatTimeLabel(timeOfDay?: string | null) {
  const [hourRaw, minuteRaw] = normalizeTimeOfDay(timeOfDay).split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
}

export function summarizeSchedule(schedule: JobScheduleInput) {
  switch (schedule.frequency) {
    case "every_minutes": {
      const minutes = normalizeIntervalMinutes(schedule.intervalMinutes);
      return minutes === 60 ? "Every hour" : `Every ${minutes} minute${minutes === 1 ? "" : "s"}`;
    }
    case "hourly":
      return "Every hour";
    case "weekly":
      return `Every ${WEEKDAYS[normalizeWeekday(schedule.weekday)]} at ${formatTimeLabel(schedule.timeOfDay)}`;
    case "daily":
    default:
      return `Every day at ${formatTimeLabel(schedule.timeOfDay)}`;
  }
}

export function nextRunAt(schedule: JobScheduleInput, from = Date.now()) {
  const start = new Date(from);
  const next = new Date(from);

  switch (schedule.frequency) {
    case "every_minutes": {
      const minutes = normalizeIntervalMinutes(schedule.intervalMinutes);
      return from + minutes * 60_000;
    }
    case "hourly": {
      next.setMinutes(0, 0, 0);
      next.setHours(start.getHours() + 1);
      return next.getTime();
    }
    case "weekly": {
      const [hourRaw, minuteRaw] = normalizeTimeOfDay(schedule.timeOfDay).split(":");
      const targetDay = normalizeWeekday(schedule.weekday);
      next.setHours(Number(hourRaw), Number(minuteRaw), 0, 0);
      const dayDelta = (targetDay - next.getDay() + 7) % 7;
      next.setDate(next.getDate() + dayDelta);
      if (next.getTime() <= from) next.setDate(next.getDate() + 7);
      return next.getTime();
    }
    case "daily":
    default: {
      const [hourRaw, minuteRaw] = normalizeTimeOfDay(schedule.timeOfDay).split(":");
      next.setHours(Number(hourRaw), Number(minuteRaw), 0, 0);
      if (next.getTime() <= from) next.setDate(next.getDate() + 1);
      return next.getTime();
    }
  }
}
