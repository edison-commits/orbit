export type SocialPlatform = 'instagram' | 'twitter' | 'linkedin';

const SOCIAL_HOSTS: Record<SocialPlatform, string[]> = {
  instagram: ['instagram.com', 'www.instagram.com'],
  twitter: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'],
  linkedin: ['linkedin.com', 'www.linkedin.com'],
};

function stripUrlParts(value: string, platform: SocialPlatform) {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    const host = url.hostname.toLowerCase();
    if (!SOCIAL_HOSTS[platform].includes(host)) return trimmed;

    const segments = url.pathname.split('/').filter(Boolean);
    if (platform === 'linkedin' && segments[0]?.toLowerCase() === 'in') {
      return segments[1] ?? '';
    }
    return segments[0] ?? '';
  } catch {
    return trimmed;
  }
}

export function normalizeSocialHandle(platform: SocialPlatform, value: string | null | undefined) {
  const withoutUrl = stripUrlParts(value ?? '', platform);
  return withoutUrl
    .replace(/^@+/, '')
    .replace(/\?.*$/, '')
    .replace(/#.*$/, '')
    .replace(/\/+$/, '')
    .trim();
}

export function formatSocialHandle(platform: SocialPlatform, value: string) {
  const handle = normalizeSocialHandle(platform, value);
  if (!handle) return '';
  return platform === 'linkedin' ? handle : `@${handle}`;
}

export function getSocialUrls(platform: SocialPlatform, value: string) {
  const handle = normalizeSocialHandle(platform, value);
  if (!handle) return null;

  const encodedHandle = encodeURIComponent(handle);
  const webUrls: Record<SocialPlatform, string> = {
    instagram: `https://instagram.com/${encodedHandle}`,
    twitter: `https://x.com/${encodedHandle}`,
    linkedin: `https://linkedin.com/in/${encodedHandle}`,
  };

  return {
    preferred: platform === 'instagram' ? `instagram://user?username=${encodedHandle}` : webUrls[platform],
    fallback: webUrls[platform],
  };
}
