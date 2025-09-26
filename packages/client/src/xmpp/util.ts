/**
 * Extract domain from XMPP service URL
 */
export function extractDomainFromService(service: string): string {
  try {
    const url = new URL(service);
    return url.hostname;
  } catch (error) {
    throw new Error(`Invalid service URL: ${service}`);
  }
}
