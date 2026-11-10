/**
 * Helper to ensure direct video URLs with query params/hash play reliably
 * across mixed-content (HTTP on HTTPS) and CORS restrictions by routing
 * through the secure backend streaming proxy when necessary.
 */
export function getPlayableStreamUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (trimmed.includes('/api/proxy/stream')) {
      return trimmed;
    }

    const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
    
    // Mixed content (HTTP video on HTTPS page) must be proxied through backend to prevent browser security block
    if (isHttpsPage && trimmed.startsWith('http://')) {
      return `/api/proxy/stream?url=${encodeURIComponent(trimmed)}`;
    }

    // Direct HTTP or custom DDNS/ngrok servers on ports 8080/8000 that block CORS
    if (trimmed.includes(':8080') || trimmed.includes(':8000') || trimmed.includes('ddns.net') || trimmed.includes('ngrok')) {
      return `/api/proxy/stream?url=${encodeURIComponent(trimmed)}`;
    }
  }

  return trimmed;
}

