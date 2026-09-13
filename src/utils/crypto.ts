/**
 * Utility functions for local credential verification using SHA-256 with salt.
 * 
 * SECURITY NOTICE (OWASP Broken Access Control mitigation):
 * This client-side hashing mechanism is a local transient barrier designed to protect
 * against physical shoulder-surfing / unauthorized local terminal access when the app
 * runs purely client-side. The definitive security boundary requires a hardened backend
 * with server-side authentication (e.g., Express + bcrypt/Argon2 + HTTP-only cookies/JWT).
 */

export async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${pin}:beauty_space_secret_v1`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}
