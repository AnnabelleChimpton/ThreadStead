/**
 * Base URL for SSR self-fetches (getServerSideProps calling this app's own
 * /api routes).
 *
 * Never derive this from the request's Host header: any stray domain pointed
 * at this server (or a client-forged Host) would make the server fetch itself
 * back through the public proxy under that hostname — a TLS-failure/log-spam
 * factory and a host-header-injection surface. The API runs in this same
 * process, so loop back directly.
 *
 * Set INTERNAL_BASE_URL only for unusual setups (e.g. MOBILE_TESTING HTTPS
 * dev mode, or the app listening on a non-loopback interface only).
 */
export function getInternalBaseUrl(): string {
  return (
    process.env.INTERNAL_BASE_URL ||
    `http://127.0.0.1:${process.env.PORT || 3000}`
  );
}
