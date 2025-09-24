import { readFileSync } from 'fs';

export function readSecret(
  name: string,
  options: { fallback?: string; required?: boolean } = {}
): string | undefined {
  const fileKey = process.env[`${name}_FILE`];
  if (fileKey) {
    try {
      const value = readFileSync(fileKey, 'utf-8').trim();
      if (value) {
        return value;
      }
    } catch (error) {
      if (options.required) {
        throw new Error(`Failed to read secret file for ${name}: ${(error as Error).message}`);
      }
    }
  }

  const envValue = process.env[name];
  if (envValue && envValue.length > 0) {
    return envValue;
  }

  if (options.fallback !== undefined) {
    return options.fallback;
  }

  if (options.required) {
    throw new Error(`${name} is not configured`);
  }

  return undefined;
}
