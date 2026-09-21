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
  const first = openDays[0];
  const last = openDays[openDays.length - 1];
  const days = first === last ? shortDay(first) : `${shortDay(first)}–${shortDay(last)}`;
  return `${days} ${friendlyTime(sample.open)}–${friendlyTime(sample.close)}`;
}

function shortDay(day: WeekdayKey): string {
  return `${day[0].toUpperCase()}${day.slice(1, 3)}`;
}

/** "08:00" → "8am", "17:30" → "5:30pm". */
function friendlyTime(time: string): string {
  const [h, m] = time.split(':').map((value) => parseInt(value, 10));
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const minutes = m ? `:${String(m).padStart(2, '0')}` : '';
  return `${hour12}${minutes}${h < 12 ? 'am' : 'pm'}`;
}
