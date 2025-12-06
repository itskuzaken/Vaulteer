/**
 * Utilities for handling timezone conversions for events.
 * We adopt an approach where the server stores timestamps in UTC.
 * For event creation/update, incoming date/time strings WITHOUT timezone information
 * are assumed to be in +08:00 (Asia/Singapore) timezone.
 */

function hasTimezoneInfo(value) {
  return /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
}

function pad(n) { return String(n).padStart(2, '0'); }

function parseNaivePlus8ToUTCIso(value) {
  // value expected format: YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) throw new Error(`Invalid date format: ${value}`);
  const [ , y, mo, d, hh, mm, ss='00' ] = m;
  const naiveUtcMs = Date.UTC(parseInt(y), parseInt(mo)-1, parseInt(d), parseInt(hh), parseInt(mm), parseInt(ss));
  const offsetMs = 8 * 60 * 60 * 1000; // +08:00
  const utcMs = naiveUtcMs - offsetMs; // convert from +08 local to UTC ms
  const dt = new Date(utcMs);
  return dt.toISOString();
}

function parseToUtcIso(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const str = String(value).trim();
  if (hasTimezoneInfo(str)) {
    // ISO with timezone or Z - rely on JS Date parsing
    const dt = new Date(str);
    if (Number.isNaN(dt.getTime())) throw new Error(`Invalid date: ${value}`);
    return dt.toISOString();
  }
  // treat as naive local in +08
  return parseNaivePlus8ToUTCIso(str);
}

function convertUtcIsoToPlus8Input(value) {
  if (!value) return '';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  const offsetMs = 8 * 60 * 60 * 1000;
  const plus8 = new Date(dt.getTime() + offsetMs);
  const year = plus8.getUTCFullYear();
  const month = pad(plus8.getUTCMonth() + 1);
  const day = pad(plus8.getUTCDate());
  const hours = pad(plus8.getUTCHours());
  const minutes = pad(plus8.getUTCMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function convertUtcIsoToPlus8Friendly(value) {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  const offsetMs = 8 * 60 * 60 * 1000;
  const plus8 = new Date(dt.getTime() + offsetMs);
  // e.g., '2025-12-06T10:30:00+08:00'
  const year = plus8.getUTCFullYear();
  const month = pad(plus8.getUTCMonth() + 1);
  const day = pad(plus8.getUTCDate());
  const hours = pad(plus8.getUTCHours());
  const minutes = pad(plus8.getUTCMinutes());
  const seconds = pad(plus8.getUTCSeconds());
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+08:00`;
}

function isPastInPlus8(value) {
  if (!value) return false;
  const utcIso = parseToUtcIso(value);
  const nowUtc = new Date();
  const target = new Date(utcIso);
  return target.getTime() <= nowUtc.getTime();
}

module.exports = {
  parseToUtcIso,
  convertUtcIsoToPlus8Input,
  convertUtcIsoToPlus8Friendly,
  isPastInPlus8,
};
