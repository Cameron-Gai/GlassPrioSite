/**
 * Progressive US phone formatting for text inputs: digits format as
 * (206) 555-1234 while typing; deletions pass through untouched so backspace
 * never fights the punctuation; anything starting with "+" (international) is
 * left alone entirely. Validation elsewhere accepts both formatted and raw.
 */
export function formatUsPhone(raw: string): string {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith('+')) return raw;
  const digits = trimmed.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Format on additions only — deletions keep the raw value so backspacing
 *  through "(206) " doesn't re-insert what was just removed. */
export function formatUsPhoneInput(previous: string, next: string): string {
  if (next.length < previous.length) return next;
  return formatUsPhone(next);
}
