const REDACTED = '[redacted]';
const PII_KEYS = new Set(['password', 'token', 'otp', 'phone', 'email', 'icNumber']);

export function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce(
      (acc, [key, val]) => ({
        ...acc,
        [key]: PII_KEYS.has(key) ? REDACTED : sanitizeValue(val)
      }),
      {}
    );
  }
  if (typeof value === 'string' && value.length > 256) {
    return `${value.substring(0, 253)}...`;
  }
  return value;
}
