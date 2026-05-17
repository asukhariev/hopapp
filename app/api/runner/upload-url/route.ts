import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { checkRunnerAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Runner uploads via the @vercel/blob/client flow:
 * 1. Runner -> POST /api/runner/upload-url with filename + token request
 * 2. We sign and return a write URL
 * 3. Runner PUTs the file directly to Blob storage
 * 4. We don't need to proxy the upload bytes through this function.
 */
export async function POST(req: Request) {
  const authErr = checkRunnerAuth(req);
  if (authErr) return authErr;

  const body = (await req.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => ({
        allowedContentTypes: [
          "text/csv",
          "application/vnd.ms-excel",
          "application/octet-stream",
        ],
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ pathname }),
      }),
      onUploadCompleted: async () => {
        // No-op; the runner will call /api/runner/event with the URL.
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "upload failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
