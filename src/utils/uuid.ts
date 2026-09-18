/**
 * UUID validation utility for PostgreSQL UUID columns
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isValidUUID = (val: unknown): val is string => {
  return typeof val === 'string' && UUID_REGEX.test(val);
};
