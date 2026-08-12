/**
 * Resolves the API base URL for calls from the Expo app.
 *
 * In Replit the API server is reachable at the shared dev domain, e.g.
 *   https://<REPLIT_DEV_DOMAIN>/api
 *
 * Set EXPO_PUBLIC_API_BASE_URL in the mobile app's .env to override.
 * Falls back to the Replit dev-domain env var so the app works out of
 * the box without a separate .env entry.
 */
function resolveApiBase(): string {
  // Injected by Expo at bundle time from .env or the environment
  const explicit = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  // Available in Replit container environments at build time
  const replitDomain = process.env.REPLIT_DEV_DOMAIN;
  if (replitDomain) return `https://${replitDomain}/api`;

  // Local fallback
  return "http://localhost:3001/api";
}

export const API_BASE_URL = resolveApiBase();
