const DAY_IN_MS = 24 * 60 * 60 * 1000;

const parseDateValue = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const normalizedIso = raw
    .replace(" ", "T")
    .replace(/\.(\d{3})\d+/, ".$1");

  const normalized = new Date(normalizedIso);
  if (!Number.isNaN(normalized.getTime())) {
    return normalized;
  }

  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,6}))?)?(?:Z|([+-]\d{2}):?(\d{2}))?$/
  );

  if (!match) {
    return null;
  }

  const [
    ,
    year,
    month,
    day,
    hour = "0",
    minute = "0",
    second = "0",
    fraction = "0",
    offsetSign,
    offsetMinutePart,
  ] = match;

  const millis = Number(String(fraction).padEnd(3, "0").slice(0, 3));
  const localDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    millis
  );

  if (!offsetSign) {
    return Number.isNaN(localDate.getTime()) ? null : localDate;
  }

  const offsetDirection = String(offsetSign || "+")[0] === "-" ? -1 : 1;
  const offsetHours = Number(String(offsetSign || "+00").slice(1)) || 0;
  const offsetMinutes = Number(offsetMinutePart || "0") || 0;
  const signedOffsetMinutes = offsetDirection * (offsetHours * 60 + offsetMinutes);
  const utcTime = localDate.getTime() - signedOffsetMinutes * 60 * 1000;
  const fallback = new Date(utcTime);

  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

export const formatApplicationStatus = (applicationStatus) =>
  String(applicationStatus || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase()) || "Application Submitted";

export const formatDisplayDate = (value) => {
  const date = parseDateValue(value);

  if (!date) {
    return "—";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const getDaysSince = (value, now = new Date()) => {
  const start = parseDateValue(value);

  if (!start) {
    return null;
  }

  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return Math.max(0, Math.floor((endDate - startDate) / DAY_IN_MS));
};

// utils/applicationStatus.js

const daysBetween = (from, to) => {
  if (!from) return 0;
  const start = new Date(from);
  const end = to ? new Date(to) : new Date();   // defaults to today if no `to`
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
};

export const formatDayProgress = (prefix, from, to) => {
  const days = daysBetween(from, to);
  return `${prefix} ${days} ${days === 1 ? "day" : "days"}`;
};
