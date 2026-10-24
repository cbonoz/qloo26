# Abuse and AI-cost safeguards

LaunchLens has no user accounts. The AI-backed endpoints are `POST /api/cues`
(xAI reference suggestions plus Qloo resolution) and `POST /api/analyze` (Qloo
searches/insights plus xAI narrative generation). Both use server-side keys.

## In place

- Same-origin JSON only, an 8 KB request-body cap, field-length limits, and a
  hidden honeypot field.
- A salted, IP-only anonymous identifier. The User-Agent is deliberately not
  part of the key because callers can rotate it trivially.
- A 30-request-per-minute attempt limit per anonymous identifier.
- Daily per-visitor limits: 3 analyses and 10 reference suggestions.
- Per-process daily ceilings: 500 analyses and 500 suggestions by default.
- Optional shared counters (`KEYVALUE_APP_KEY`) for per-visitor and global
  daily caps across serverless instances. The global cap also acts as the
  per-process ceiling when no shared store is configured. The routes fail
  closed if a configured shared store cannot be reached.
- Operator kill switch: `LAUNCHLENS_ANALYSIS_ENABLED=false`.
- Provider timeouts, strict JSON schemas, output-token caps, and `store: false`
  on xAI requests.
- xAI retries only when the model rejects the request shape (HTTP 400/422),
  not when it returns a rate limit or provider error.
- No account database or saved reports; drafts live in the browser session.

The daily limits can be tuned with:

```bash
LAUNCHLENS_DAILY_ANALYSES_PER_VISITOR=3
LAUNCHLENS_DAILY_SUGGESTIONS_PER_VISITOR=10
LAUNCHLENS_DAILY_ANALYSES_GLOBAL=500
LAUNCHLENS_DAILY_SUGGESTIONS_GLOBAL=500
```

## Known limits

- IP-based limits are shared by people behind the same NAT and can be bypassed
  by an attacker rotating source IPs.
- On Vercel the identifier uses `x-vercel-forwarded-for`; elsewhere it uses
  `x-real-ip` or the last `x-forwarded-for` hop. A self-hosted deployment must
  sit behind a proxy that overwrites those headers, or callers can spoof them.
- Without `KEYVALUE_APP_KEY`, counters are in memory only. They reset on a
  process restart and are not shared across serverless instances.
- The key-value store has no documented compare-and-set operation. Its shared
  counters are abuse friction, not a hard atomic billing quota.
- A shared global cap protects spend but can be exhausted by a determined
  attacker, temporarily denying service to legitimate visitors.
- The app has no CAPTCHA or proof-of-work challenge. That belongs at the edge
  or as a separate optional layer for a high-traffic public launch.

## Deployment checklist

1. Set `RATE_LIMIT_SALT` and `KEYVALUE_APP_KEY`.
2. Configure spend limits and billing alerts with Qloo and xAI.
3. Add an edge/WAF rate limit for `/api/analyze` and `/api/cues`.
4. Consider Cloudflare Turnstile or equivalent for a public launch.
5. Keep `LAUNCHLENS_ANALYSIS_ENABLED=false` available as an incident switch.
6. Monitor 429/503 responses and provider usage; investigate sudden spikes.
