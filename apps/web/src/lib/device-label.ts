/**
 * Coarse, privacy-respecting device label derived from a User-Agent string.
 *
 * PRIVACY CHOICE (see db/030_session_device_hint.sql): this returns ONLY a
 * short "Browser on OS" FAMILY label — e.g. "Chrome on Windows", "Safari on
 * iPhone". It deliberately drops all version numbers, build strings, device
 * models, and every other token. We never persist the raw User-Agent, an IP
 * address, or any location; the caller stores only this bounded string. The
 * label exists so a member can *recognise* one of their own signed-in browsers
 * in the "Signed-in browsers" panel — it is a trust affordance, not a
 * fingerprint, and is far too coarse to re-identify a device.
 *
 * Returns `null` for a missing / empty / unrecognisable User-Agent so callers
 * store NULL and the UI falls back to the honest generic "Browser session"
 * rather than inventing a fake device name.
 */

const MAX_LABEL_LENGTH = 60;

// Order matters: more specific engines/brands are checked before the generic
// families they are built on (Edge/Opera before Chrome; Chrome before Safari,
// since Chrome UAs also contain "Safari").
function detectBrowser(ua: string): string | null {
  if (/\bEdg(?:e|A|iOS)?\//.test(ua)) return "Edge";
  if (/\bOPR\/|\bOpera\b/.test(ua)) return "Opera";
  if (/\bFirefox\/|\bFxiOS\//.test(ua)) return "Firefox";
  if (/\bSamsungBrowser\//.test(ua)) return "Samsung Internet";
  if (/\bCriOS\//.test(ua)) return "Chrome";
  if (/\bChrome\/|\bChromium\//.test(ua)) return "Chrome";
  // Safari must come last: only treat as Safari when it is genuinely WebKit
  // Safari (not one of the Chromium-family UAs handled above).
  if (/\bSafari\//.test(ua) && /\bVersion\//.test(ua)) return "Safari";
  return null;
}

function detectOs(ua: string): string | null {
  // iPhone / iPad first (they also contain "Mac OS X" fragments on iPadOS).
  if (/\biPhone\b/.test(ua)) return "iPhone";
  if (/\biPad\b/.test(ua)) return "iPad";
  if (/\biPod\b/.test(ua)) return "iPod";
  if (/\bAndroid\b/.test(ua)) return "Android";
  if (/\bWindows\b/.test(ua)) return "Windows";
  // Mac desktop — exclude the iOS cases already handled above.
  if (/\bMac OS X\b|\bMacintosh\b/.test(ua)) return "Mac";
  if (/\bCrOS\b/.test(ua)) return "ChromeOS";
  if (/\bLinux\b/.test(ua)) return "Linux";
  return null;
}

export function deriveDeviceLabel(userAgent: string | null | undefined): string | null {
  if (typeof userAgent !== "string") return null;
  const ua = userAgent.trim();
  if (ua.length === 0 || ua.length > 2000) return null;

  const browser = detectBrowser(ua);
  const os = detectOs(ua);

  let label: string | null;
  if (browser && os) label = `${browser} on ${os}`;
  else if (browser) label = browser;
  else if (os) label = `Browser on ${os}`;
  else label = null;

  if (label && label.length > MAX_LABEL_LENGTH) label = label.slice(0, MAX_LABEL_LENGTH);
  return label;
}
