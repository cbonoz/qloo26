import { NextResponse } from "next/server";

export function GET(request: Request) {
  // Read a request-time value so Next.js does not bake environment flags into a static response.
  return NextResponse.json({
    qlooConfigured: Boolean(process.env.QLOO_API_KEY),
    xaiConfigured: Boolean(process.env.XAI_API_KEY),
    analysisEnabled: process.env.LAUNCHLENS_ANALYSIS_ENABLED !== "false",
    sharedRateLimitConfigured: Boolean(process.env.KEYVALUE_APP_KEY?.trim()),
  }, {
    headers: {
      "Cache-Control": "no-store",
      Vary: request.headers.has("accept") ? "Accept" : "*",
    },
  });
}
