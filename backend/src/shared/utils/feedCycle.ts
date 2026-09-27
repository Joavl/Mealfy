/**
 * Daily support cycles begin at 08:00 in America/Sao_Paulo. Persist the
 * resulting instant in UTC, never a local date or a fixed UTC offset: the
 * latter is wrong for historical tzdata and for any future rule change.
 */
export const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo';
export const SAO_PAULO_CYCLE_HOUR = 8;

type LocalDate = Readonly<{ year: number; month: number; day: number }>;

const partsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SAO_PAULO_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  second: '2-digit',
});

function numberedParts(instant: Date): Record<string, number> {
  const values: Record<string, number> = {};
  for (const part of partsFormatter.formatToParts(instant)) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  return values;
}

function saoPauloDate(instant: Date): LocalDate {
  const parts = numberedParts(instant);
  return { year: parts.year, month: parts.month, day: parts.day };
}

function calendarDate(date: LocalDate, offsetDays: number): LocalDate {
  const result = new Date(Date.UTC(date.year, date.month - 1, date.day + offsetDays));
  return { year: result.getUTCFullYear(), month: result.getUTCMonth() + 1, day: result.getUTCDate() };
}

/**
 * Converts an unambiguous 08:00 São Paulo wall-clock time to its UTC instant.
 * Iterating the Intl-derived offset avoids baking a UTC-3 assumption into the
 * domain. Eight o'clock is deliberately chosen by the product and avoids the
 * midnight DST transitions present in historical Brazilian tzdata.
 */
function cycleStartForDate(date: LocalDate): Date {
  const wantedWallClock = Date.UTC(date.year, date.month - 1, date.day, SAO_PAULO_CYCLE_HOUR);
  let timestamp = wantedWallClock;

  // A timezone offset is a function of the instant, so derive and converge it
  // rather than applying an offset from the caller's current date.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = numberedParts(new Date(timestamp));
    const observedWallClock = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    const adjusted = timestamp + (wantedWallClock - observedWallClock);
    if (adjusted === timestamp) break;
    timestamp = adjusted;
  }

  const result = new Date(timestamp);
  const local = numberedParts(result);
  if (local.year !== date.year || local.month !== date.month || local.day !== date.day || local.hour !== SAO_PAULO_CYCLE_HOUR || local.minute !== 0 || local.second !== 0) {
    throw new Error('Could not resolve the São Paulo 08:00 cycle boundary with current tzdata.');
  }
  return result;
}

/** Start of the current persisted UTC cycle: last São Paulo 08:00 <= now. */
export function getCurrentCycleStart(now: Date = new Date()): Date {
  const date = saoPauloDate(now);
  const todayStart = cycleStartForDate(date);
  return now.getTime() < todayStart.getTime() ? cycleStartForDate(calendarDate(date, -1)) : todayStart;
}

/** True if the family was fed in the current São Paulo support cycle. */
export function wasFedThisCycle(lastFedAt: Date | null | undefined, now: Date = new Date()): boolean {
  return Boolean(lastFedAt && lastFedAt.getTime() >= getCurrentCycleStart(now).getTime());
}

/** True if the family requested support in the current São Paulo support cycle. */
export function wasRequestedThisCycle(requestedAt: Date | null | undefined, now: Date = new Date()): boolean {
  return Boolean(requestedAt && requestedAt.getTime() >= getCurrentCycleStart(now).getTime());
}

/** Next São Paulo 08:00 boundary, retaining local calendar semantics across DST. */
export function nextCycleStart(now: Date = new Date()): Date {
  return cycleStartForDate(calendarDate(saoPauloDate(getCurrentCycleStart(now)), 1));
}
