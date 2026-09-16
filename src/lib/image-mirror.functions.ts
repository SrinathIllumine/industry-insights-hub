import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const inputSchema = z.object({
  url: z.string().min(1).max(2000),
});

const MEDIA_BUCKET = "company-media";
const MAX_BYTES = 10 * 1024 * 1024;

function serverStorageClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    throw new Error("Supabase is not configured on the server.");
  }
  return createClient(url, key);
}

function extFromContentType(contentType: string): string {
  const sub = (/image\/([a-z0-9.+-]+)/i.exec(contentType)?.[1] ?? "png").toLowerCase();
  if (sub === "svg+xml") return "svg";
  if (sub === "jpeg") return "jpg";
  return sub.replace(/[^a-z0-9]/g, "") || "png";
}

/**
 * Fetches a remote image server-side (no browser CORS restrictions) and
 * re-hosts it in our own storage bucket, so a pasted / imported image URL
 * keeps working even if the original source later moves or blocks hotlinking.
 */
export const mirrorImageUrl = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    if (!/^https?:\/\//i.test(data.url)) {
      return { ok: false as const, error: "Not a web image URL." };
    }

    let response: Response;
    try {
      response = await fetch(data.url, { redirect: "follow" });
    } catch {
      return { ok: false as const, error: "Could not reach that image URL." };
    }
    if (!response.ok) {
      return { ok: false as const, error: `Image URL returned ${response.status}.` };
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return { ok: false as const, error: "That URL does not point to an image." };
    }

    const arrayBuf = await response.arrayBuffer();
    if (arrayBuf.byteLength === 0) {
      return { ok: false as const, error: "The image was empty." };
    }
    if (arrayBuf.byteLength > MAX_BYTES) {
      return { ok: false as const, error: "Image is larger than 10 MB." };
    }

    const ext = extFromContentType(contentType);
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const path = `mirrored/${id}.${ext}`;

    let supabase: ReturnType<typeof serverStorageClient>;
    try {
      supabase = serverStorageClient();
    } catch (error) {
      return { ok: false as const, error: (error as Error).message };
    }

    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, Buffer.from(arrayBuf), {
      cacheControl: "3600",
      upsert: false,
      contentType,
    });
    if (error) {
      return { ok: false as const, error: error.message };
    }

    const publicUrl = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
    return { ok: true as const, url: publicUrl };
  });
