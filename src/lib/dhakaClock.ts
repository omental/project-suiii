import { useEffect, useMemo, useState } from "react";

export const DHAKA_TIME_ZONE = "Asia/Dhaka";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: DHAKA_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric"
});

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DHAKA_TIME_ZONE,
  weekday: "long",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});

export type DhakaParts = {
  dateKey: string;
  weekday: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function partMap(date: Date) {
  return Object.fromEntries(partsFormatter.formatToParts(date).map((part) => [part.type, part.value]));
}

export function getDhakaParts(date = new Date()): DhakaParts {
  const parts = partMap(date);
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour) % 24;
  const minute = Number(parts.minute);
  const second = Number(parts.second);
  return {
    dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    weekday: parts.weekday,
    year,
    month,
    day,
    hour,
    minute,
    second
  };
}

export function getDhakaDateKey(date = new Date()) {
  return getDhakaParts(date).dateKey;
}

export function getDhakaGreeting(date = new Date()) {
  const hour = getDhakaParts(date).hour;
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Still up, champion";
}

function utcNoon(dateKey: string) {
  return new Date(`${dateKey}T12:00:00.000Z`);
}

export function addDays(dateKey: string, amount: number) {
  const date = utcNoon(dateKey);
  date.setUTCDate(date.getUTCDate() + amount);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysBetween(startDateKey: string, endDateKey: string) {
  return Math.round((utcNoon(endDateKey).getTime() - utcNoon(startDateKey).getTime()) / 86400000);
}

export function getProgrammePosition(startDateKey: string, todayDateKey: string) {
  const elapsed = Math.max(0, daysBetween(startDateKey, todayDateKey));
  return {
    day: (elapsed % 7) + 1,
    week: Math.floor(elapsed / 7) + 1,
    programmeDay: elapsed + 1
  };
}

export function getWeekdayName(dateKey: string) {
  return dateFormatter.format(utcNoon(dateKey)).split(",")[0];
}

export function formatDhakaDisplayDate(dateKey: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long"
  }).formatToParts(utcNoon(dateKey));
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  return `${weekday} ${day} ${month}`.toUpperCase();
}

export function formatDhakaShortDate(dateKey: string) {
  return dateFormatter.format(utcNoon(dateKey));
}

export function useDhakaClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const intervalId = window.setInterval(tick, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  return useMemo(() => {
    if (!now) {
      return {
        hydrated: false,
        now: null,
        dateKey: "",
        displayDate: "",
        greeting: "",
        parts: null as DhakaParts | null
      };
    }
    const parts = getDhakaParts(now);
    return {
      hydrated: true,
      now,
      dateKey: parts.dateKey,
      displayDate: formatDhakaDisplayDate(parts.dateKey),
      greeting: getDhakaGreeting(now),
      parts
    };
  }, [now]);
}
