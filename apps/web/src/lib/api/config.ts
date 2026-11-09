/**
 * Where the web app reaches the api.
 * - Server side (Server Components, route handlers): API_BASE_URL at RUNTIME
 *   (k8s: http://api:4000, local: http://localhost:4000).
 * - Browser: same-origin `/api/proxy`, which forwards to API_BASE_URL. The api stays
 *   internal to the cluster, so there's no CORS and no api URL baked into the bundle.
 */
export function apiBaseUrl(): string {
  if (typeof window !== "undefined") return "/api/proxy";
  return process.env.API_BASE_URL ?? "http://localhost:4000";
}
