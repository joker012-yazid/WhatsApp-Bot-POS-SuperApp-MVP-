import { isPlainObject } from './utils';

type Sanitizable = Record<string, unknown> | unknown[] | undefined;

const PII_FIELDS = new Set(['password', 'email', 'phone', 'totpCode', 'icNumber', 'nric', 'token']);

function scrubValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item));
  }

  if (isPlainObject(value)) {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, val]) => {
      if (PII_FIELDS.has(key)) {
        acc[key] = '[redacted]';
      } else {
        acc[key] = scrubValue(val);
      }
      return acc;
    }, {});
  }

  return value;
}

export function sanitizeForLogging(payload: { body?: Sanitizable; query?: Sanitizable; params?: Sanitizable }) {
  return {
    body: scrubValue(payload.body),
    query: scrubValue(payload.query),
    params: scrubValue(payload.params)
  };
}
