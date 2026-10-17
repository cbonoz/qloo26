import { NextResponse } from "next/server";

export function GET(request: Request) {
  // Read a request-time value so Next.js does not bake environment flags into a static response.
  return NextResponse.json({
    qlooConfigured: Boolean(process.env.QLOO_API_KEY),
    narrativeConfigured: Boolean(process.env.OPENAI_API_KEY),
  }, {
    headers: {
      "Cache-Control": "no-store",
      Vary: request.headers.has("accept") ? "Accept" : "*",
    },
  });
}
