export type ExtractedImage = { src: string; alt: string };

export type ParsedHtml = { text: string; images: ExtractedImage[] };

const IMG_HREF_RE = /^(?:https?:)?\/\/\S+\.(?:png|jpe?g|gif|webp|svg|avif)(?:\?\S*)?$/i;

/** Returns true for files we should treat as an HTML dump. */
export function isHtmlFile(file: { name: string; type?: string }): boolean {
  if (file.type === "text/html" || file.type === "application/xhtml+xml") return true;
  return /\.x?html?$/i.test(file.name);
}

function firstToken(value: string): string {
  return value.trim().split(/\s+/)[0] ?? "";
}

/** Extracts readable text and any usable image references from an HTML dump. */
export function parseHtmlDump(html: string): ParsedHtml {
  if (typeof DOMParser === "undefined" || typeof XMLSerializer === "undefined") {
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const images: ExtractedImage[] = [];
    const seen = new Set<string>();
    const re = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      const u = (m[1] ?? "").trim();
      if ((/^data:image\//i.test(u) || IMG_HREF_RE.test(u)) && !seen.has(u)) {
        seen.add(u);
        images.push({ src: u, alt: "" });
      }
    }
    return { text, images };
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, noscript").forEach((n) => n.remove());

  const images: ExtractedImage[] = [];
  const seen = new Set<string>();
  const add = (src: string, alt: string) => {
    const clean = src.trim();
    if (!clean || seen.has(clean)) return;
    // accept absolute http(s), protocol-relative, and inline data images
    if (!/^(https?:|\/\/|data:image\/)/i.test(clean)) return;
    seen.add(clean);
    images.push({ src: clean.startsWith("//") ? `https:${clean}` : clean, alt: alt.trim() });
  };

  // <img>, including lazy-load attributes and srcset
  doc.querySelectorAll("img").forEach((img) => {
    const alt = img.getAttribute("alt") || "";
    add(
      img.getAttribute("src") ||
        img.getAttribute("data-src") ||
        img.getAttribute("data-original") ||
        img.getAttribute("data-lazy-src") ||
        "",
      alt,
    );
    const srcset = img.getAttribute("srcset") || img.getAttribute("data-srcset") || "";
    srcset.split(",").forEach((part) => part.trim() && add(firstToken(part), alt));
  });

  // <picture><source srcset>
  doc.querySelectorAll("source[srcset]").forEach((s) => {
    (s.getAttribute("srcset") || "").split(",").forEach((part) => part.trim() && add(firstToken(part), ""));
  });

  // links straight to an image file
  doc.querySelectorAll("a[href]").forEach((a) => {
    const href = (a.getAttribute("href") || "").trim();
    if (IMG_HREF_RE.test(href)) add(href, a.textContent || "");
  });

  // CSS background images on inline styles
  doc.querySelectorAll("[style]").forEach((el) => {
    const style = el.getAttribute("style") || "";
    const m = /background(?:-image)?\s*:[^;]*url\(\s*(['"]?)([^'")]+)\1\s*\)/i.exec(style);
    if (m && m[2]) add(m[2], "");
  });

  // inline <svg> charts — serialize to a data URL, skipping small icons
  doc.querySelectorAll("svg").forEach((svg) => {
    if (svg.closest("button, a")) return;
    const w = parseFloat(svg.getAttribute("width") || "0");
    const h = parseFloat(svg.getAttribute("height") || "0");
    const vb = (svg.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
    const vbMax = vb.length === 4 ? Math.max(vb[2] || 0, vb[3] || 0) : 0;
    const shapeCount = svg.querySelectorAll(
      "path, rect, circle, line, text, polyline, polygon, g",
    ).length;
    const looksLikeChart = w >= 140 || h >= 140 || vbMax >= 140 || shapeCount >= 8;
    if (!looksLikeChart) return;

    let markup = new XMLSerializer().serializeToString(svg);
    if (!/\sxmlns=/.test(markup)) {
      markup = markup.replace(/^<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (markup.length > 400) {
      const title = svg.querySelector("title")?.textContent || "";
      add(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`, title);
    }
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
  const ext = /svg/i.test(mime)
    ? "svg"
    : (mime.split("/")[1] || "png").replace(/[^a-z0-9]/gi, "") || "png";
  return new File([bytes], `${name}.${ext}`, { type: mime });
}
