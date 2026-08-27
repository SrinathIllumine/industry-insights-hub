export type ExtractedImage = { src: string; alt: string };

export type ParsedHtml = { text: string; images: ExtractedImage[] };

const IMG_HREF_RE = /^https?:\/\/\S+\.(?:png|jpe?g|gif|webp|svg|avif)(?:\?\S*)?$/i;

/** Returns true for files we should treat as an HTML dump. */
export function isHtmlFile(file: { name: string; type?: string }): boolean {
  if (file.type === "text/html" || file.type === "application/xhtml+xml") return true;
  return /\.x?html?$/i.test(file.name);
}

/** Extracts readable text and any usable image references from an HTML dump. */
export function parseHtmlDump(html: string): ParsedHtml {
  if (typeof DOMParser === "undefined") {
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .trim();
    return { text, images: [] };
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, noscript").forEach((n) => n.remove());

  const images: ExtractedImage[] = [];
  const seen = new Set<string>();
  const add = (src: string, alt: string) => {
    const clean = src.trim();
    if (!clean || seen.has(clean)) return;
    if (!/^(https?:|data:image\/)/i.test(clean)) return; // skip relative / unusable refs
    seen.add(clean);
    images.push({ src: clean, alt: alt.trim() });
  };

  doc.querySelectorAll("img").forEach((img) => {
    add(img.getAttribute("src") || "", img.getAttribute("alt") || "");
  });
  doc.querySelectorAll("a[href]").forEach((a) => {
    const href = (a.getAttribute("href") || "").trim();
    if (IMG_HREF_RE.test(href)) add(href, a.textContent || "");
  });

  const body = doc.body as (HTMLElement & { innerText?: string }) | null;
  const text = (body?.innerText || body?.textContent || "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { text, images };
}

/** Converts a data: URL to a File so it can be uploaded to storage. */
export function dataUrlToFile(dataUrl: string, name = "pasted-image"): File {
  const comma = dataUrl.indexOf(",");
  const meta = dataUrl.slice(5, comma); // strip "data:"
  const mime = meta.split(";")[0] || "image/png";
  const isBase64 = /;base64/i.test(meta);
  const payload = dataUrl.slice(comma + 1);
  const binary = isBase64 ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const ext = (mime.split("/")[1] || "png").replace(/[^a-z0-9]/gi, "") || "png";
  return new File([bytes], `${name}.${ext}`, { type: mime });
}
