const DEFAULT_API_URL = 'http://localhost:3000/api';

type RuntimeApiUrlOptions = {
  configuredApiUrl?: unknown;
  expoDebuggerHost?: string | null;
  expoHostUri?: string | null;
  platform: string;
};

export function resolveRuntimeApiUrl({
  configuredApiUrl,
  expoDebuggerHost,
  expoHostUri,
  platform,
}: RuntimeApiUrlOptions) {
  const configured =
    typeof configuredApiUrl === 'string' && configuredApiUrl.trim()
      ? configuredApiUrl.trim()
      : DEFAULT_API_URL;
  const normalized = configured.replace(/\/+$/, '');

  if (platform === 'web') return normalized;

  const expoHost = getHostname(expoHostUri) ?? getHostname(expoDebuggerHost);
  if (!expoHost) return normalized;

  try {
    const url = new URL(normalized);
    if (isLocalhost(url.hostname) || isStalePrivateLanHost(url.hostname, expoHost)) {
      url.hostname = expoHost;
      return url.toString().replace(/\/+$/, '');
    }
  } catch {
    return normalized;
  }

  return normalized;
}

function getHostname(hostUri?: string | null) {
  if (!hostUri) return null;

  try {
    const url = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`);
    return url.hostname || null;
  } catch {
    return null;
  }
}

function isLocalhost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function isStalePrivateLanHost(hostname: string, expoHost: string) {
  return hostname !== expoHost && isPrivateIpv4(hostname) && isPrivateIpv4(expoHost);
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [first, second] = parts;
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}
