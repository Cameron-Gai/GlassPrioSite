import {
  businessHours as defaultConfig,
  type BusinessHoursConfig,
  type WeekdayKey
} from '$lib/config/businessHours';

const WEEKDAY_ORDER: WeekdayKey[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday'
];

interface ZonedParts {
  weekday: WeekdayKey;
  hour: number;
  minute: number;
}

function getZonedParts(date: Date, timezone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const lookup: Record<string, string> = {};
  for (const part of parts) {
    lookup[part.type] = part.value;
  }

  const weekdayName = (lookup.weekday ?? '').toLowerCase() as WeekdayKey;
  const rawHour = lookup.hour ?? '00';
  // Intl may emit "24" for midnight in some locales — normalize to 0.
  const hour = rawHour === '24' ? 0 : parseInt(rawHour, 10);
  const minute = parseInt(lookup.minute ?? '00', 10);

  return { weekday: weekdayName, hour, minute };
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map((value) => parseInt(value, 10));
  return hours * 60 + minutes;
}

export function isBusinessHours(date: Date = new Date(), config: BusinessHoursConfig = defaultConfig): boolean {
  const { weekday, hour, minute } = getZonedParts(date, config.timezone);

  if (!WEEKDAY_ORDER.includes(weekday)) {
    return false;
  }

  const dayHours = config.days[weekday];
  if (!dayHours) {
    return false;
  }

  const nowMinutes = hour * 60 + minute;
  const openMinutes = parseTimeToMinutes(dayHours.open);
  const closeMinutes = parseTimeToMinutes(dayHours.close);

  return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
}

export function describeBusinessHours(config: BusinessHoursConfig = defaultConfig): string {
  const openDays = WEEKDAY_ORDER.filter((day) => config.days[day]);
  if (openDays.length === 0) {
    return 'Closed';
  }
  const sample = config.days[openDays[0]];
  if (!sample) return 'Closed';
  return `${openDays[0][0].toUpperCase()}${openDays[0].slice(1)}–${openDays[openDays.length - 1][0].toUpperCase()}${openDays[openDays.length - 1].slice(1)}, ${sample.open}–${sample.close} ${config.timezone}`;
}
