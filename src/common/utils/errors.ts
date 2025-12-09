export const ensureError = (value: unknown): Error =>
  value instanceof Error ? value : new Error('Unknown error');

export const ensureErrnoException = (value: unknown): NodeJS.ErrnoException =>
  ensureError(value) as NodeJS.ErrnoException;
