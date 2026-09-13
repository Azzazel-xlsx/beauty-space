/**
 * Collision-resistant unique ID generator for Beauty Space.
 * Utilizes crypto.randomUUID() when available with high-resolution performance.now()
 * fallback to prevent duplicate React keys and entity collisions.
 */
export function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  // Fallback for non-standard environments
  const timestamp = Date.now().toString(36);
  const perf = typeof performance !== 'undefined' ? Math.floor(performance.now() * 1000).toString(36) : '';
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${timestamp}-${perf}-${randomPart}`;
}
