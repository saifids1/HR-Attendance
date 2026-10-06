const TIME_ZONE = "Asia/Kolkata";

function pad(value) {
  return String(value).padStart(2, "0");
}

function getIndiaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
}

function getIndiaDateTimeParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return values;
}

function isValidDateOnly(value) {
  if (typeof value !== "string") {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

function isValidTime(value) {
  if (typeof value !== "string") {
    return false;
  }

  return /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
}

function normalizeTime(value) {
  if (!isValidTime(value)) {
    return null;
  }

  if (value.length === 5) {
    return `${value}:00`;
  }

  return value;
}

function compareDateOnly(date1, date2) {
  return date1.localeCompare(date2);
}

function addDays(dateString, days) {
  if (!isValidDateOnly(dateString)) {
    throw new Error("Invalid date");
  }

  const [year, month, day] = dateString.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + days);

  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
  ].join("-");
}

function getDayOfWeek(dateString) {
  if (!isValidDateOnly(dateString)) {
    throw new Error("Invalid date");
  }

  const [year, month, day] = dateString.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCDay();
}

function isDateInRange(date, from, to) {
  if (date < from) {
    return false;
  }

  if (to && date > to) {
    return false;
  }

  return true;
}

module.exports = {
  TIME_ZONE,
  getIndiaDate,
  getIndiaDateTimeParts,
  isValidDateOnly,
  isValidTime,
  normalizeTime,
  compareDateOnly,
  addDays,
  getDayOfWeek,
  isDateInRange,
};