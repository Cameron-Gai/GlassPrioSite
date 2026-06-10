export type DayHours = { open: string; close: string } | null;

export type WeekdayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface BusinessHoursConfig {
  timezone: string;
  days: Record<WeekdayKey, DayHours>;
}

export const businessHours: BusinessHoursConfig = {
  timezone: 'America/Los_Angeles',
  days: {
    monday: { open: '08:00', close: '17:00' },
    tuesday: { open: '08:00', close: '17:00' },
    wednesday: { open: '08:00', close: '17:00' },
    thursday: { open: '08:00', close: '17:00' },
    friday: { open: '08:00', close: '17:00' },
    saturday: { open: '08:00', close: '17:00' },
    sunday: null
  }
};
