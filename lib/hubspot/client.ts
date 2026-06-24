import { HUBSPOT_API_BASE } from '../constants';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Authenticated HubSpot API fetch with backoff on 429s, transient 5xx, and network
 * errors. The last matters for long-running batch writes (~hundreds of calls over many
 * minutes): a single dropped socket (ETIMEDOUT/ECONNRESET) makes fetch() *throw*, which
 * would otherwise abort the whole run. Reads HUBSPOT_PAT from environment (works in both
 * Node.js scripts and Next.js API routes).
 */
export async function hubspotFetch(
  path: string,
  options: RequestInit = {},
  retries = 5
): Promise<Response> {
  const pat = process.env.HUBSPOT_PAT;
  if (!pat) throw new Error('HUBSPOT_PAT environment variable is not set');

  let res: Response;
  try {
    res = await fetch(`${HUBSPOT_API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${pat}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch (err) {
    // Network-level failure (dropped socket, DNS, ETIMEDOUT, ECONNRESET) — fetch() throws.
    if (retries > 0) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[HubSpot] Network error on ${path} (${msg}). Retrying in 5s (${retries} retries left)`);
      await delay(5000);
      return hubspotFetch(path, options, retries - 1);
    }
    throw err;
  }

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') ?? '10', 10);
    const backoffMs = Math.min(retryAfter * 1000, 60_000); // cap at 60s
    console.warn(`[HubSpot] Rate limited. Retrying after ${backoffMs}ms (${retries} retries left)`);
    await delay(backoffMs);
    if (retries > 0) return hubspotFetch(path, options, retries - 1);
    throw new Error('HubSpot rate limit exceeded after all retries');
  }

  // Transient server errors — back off and retry.
  if (res.status >= 500 && retries > 0) {
    console.warn(`[HubSpot] Server error ${res.status} on ${path}. Retrying in 5s (${retries} retries left)`);
    await delay(5000);
    return hubspotFetch(path, options, retries - 1);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HubSpot API error ${res.status} on ${path}: ${body}`);
  }

  return res;
}
