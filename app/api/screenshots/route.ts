import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { createScreenshot, listScreenshots } from "@/lib/store";
import { checkRunnerAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public read — the gallery page lists references.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const limit = Math.min(Number(u.searchParams.get("limit")) || 20, 100);
  const offset = Number(u.searchParams.get("offset")) || 0;
  return NextResponse.json({ screenshots: await listScreenshots(limit, offset) });
}

// Authed write — accepts raw PNG bytes + ?label= (&w=&h=), uploads to Blob,
// records a reference row. One-time captures for revision / version comparison.
export async function POST(req: Request) {
  const authErr = checkRunnerAuth(req);
  if (authErr) return authErr;

  const u = new URL(req.url);
  const label = (u.searchParams.get("label") || "screenshot").slice(0, 200);
  const width = u.searchParams.get("w") ? Number(u.searchParams.get("w")) : undefined;
  const height = u.searchParams.get("h") ? Number(u.searchParams.get("h")) : undefined;

  const bytes = Buffer.from(await req.arrayBuffer());
  if (bytes.length === 0) {
    return NextResponse.json({ error: "empty body — POST the PNG bytes" }, { status: 400 });
  }

  const id = nanoid(12);
  const { url } = await put(`screenshots/${id}.png`, bytes, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN || undefined,
  });

  const shot = await createScreenshot({ label, url, width, height });
  return NextResponse.json(shot);
}
