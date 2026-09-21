/**
 * frontend/src/config/api.ts
 * API and WebSocket URL Configuration for SkyGuard AI.
 * Supports cloud environments (Vercel + Render) via VITE_API_URL and VITE_WS_URL,
 * with seamless fallback to Vite local proxy / current window location.
 */

// Base API URL from environment variable, e.g. "https://skyguard-backend.onrender.com"
export const API_BASE_URL: string = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');

/**
 * Returns the fully qualified URL or relative path for a given API endpoint.
 * @param endpoint Relative API endpoint path, e.g. "/api/stations"
 */
export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (API_BASE_URL) {
    return `${API_BASE_URL}${cleanEndpoint}`;
  }
  return cleanEndpoint;
}

/**
 * Returns the WebSocket URL for live sensor streaming.
 * Prioritizes VITE_WS_URL, derives from VITE_API_URL if present,
 * or defaults to current window host (with ws: / wss: based on current protocol).
 * @param path WebSocket endpoint path, defaults to "/ws/readings"
 */
export function getWsUrl(path: string = '/ws/readings'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const customWs = (import.meta.env.VITE_WS_URL || '').trim();

  if (customWs) {
    return `${customWs.replace(/\/$/, '')}${cleanPath}`;
  }

  if (API_BASE_URL) {
    // Automatically translate http(s) to ws(s)
    const wsBase = API_BASE_URL
      .replace(/^http:\/\//i, 'ws://')
      .replace(/^https:\/\//i, 'wss://');
    return `${wsBase}${cleanPath}`;
  }

  if (typeof window !== 'undefined') {
    const isSecure = window.location.protocol === 'https:';
    const wsProtocol = isSecure ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}${cleanPath}`;
  }

  return `ws://127.0.0.1:8000${cleanPath}`;
}
