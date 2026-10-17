import { randomUUID } from "node:crypto";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstileToken(token: string, expectedHostname: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !token || token.length > 2048) return false;

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        response: token,
        idempotency_key: randomUUID(),
      }),
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (!response.ok) return false;

    const result = await response.json() as {
      success?: boolean;
      hostname?: string;
      action?: string;
    };
    return result.success === true &&
      result.action === "launchlens_analysis" &&
      result.hostname === expectedHostname;
  } catch {
    return false;
  }
}
