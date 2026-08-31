export type ExtractedImage = {
  src: string;
  alt: string;
  /** Nearby headings / text, used to guess which profile slot the image belongs to. */
  context: string;
};

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

/** Collects nearby headings + local text around an element, for slot matching. */
function contextFor(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  let hops = 0;
  while (node && hops < 4) {
    let sib: Element | null = node.previousElementSibling;
    let scanned = 0;
    while (sib && scanned < 12) {
      if (/^H[1-6]$/.test(sib.tagName)) {
        parts.push(sib.textContent || "");
        break;
      }
      sib = sib.previousElementSibling;
      scanned++;
    }
    node = node.parentElement;
    hops++;
  }
  parts.push(el.parentElement?.textContent?.slice(0, 240) || "");
  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 320);
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
        images.push({ src: u, alt: "", context: "" });
      }
    }
    return { text, images };
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, noscript").forEach((n) => n.remove());

  const images: ExtractedImage[] = [];
  const seen = new Set<string>();
  const add = (src: string, alt: string, context: string) => {
    const clean = src.trim();
    if (!clean || seen.has(clean)) return;
    // accept absolute http(s), protocol-relative, and inline data images
    if (!/^(https?:|\/\/|data:image\/)/i.test(clean)) return;
    seen.add(clean);
    images.push({
      src: clean.startsWith("//") ? `https:${clean}` : clean,
      alt: alt.trim(),
      context: context.trim(),
    });
  };

  // <img>, including lazy-load attributes and srcset
  doc.querySelectorAll("img").forEach((img) => {
    const alt = img.getAttribute("alt") || "";
    const ctx = contextFor(img);
    add(
      img.getAttribute("src") ||
        img.getAttribute("data-src") ||
        img.getAttribute("data-original") ||
        img.getAttribute("data-lazy-src") ||
        "",
      alt,
      ctx,
    );
    const srcset = img.getAttribute("srcset") || img.getAttribute("data-srcset") || "";
    srcset.split(",").forEach((part) => part.trim() && add(firstToken(part), alt, ctx));
  });

  // <picture><source srcset>
  doc.querySelectorAll("source[srcset]").forEach((s) => {
    const ctx = contextFor(s);
    (s.getAttribute("srcset") || "")
      .split(",")
      .forEach((part) => part.trim() && add(firstToken(part), "", ctx));
  });

  // links straight to an image file
  doc.querySelectorAll("a[href]").forEach((a) => {
    const href = (a.getAttribute("href") || "").trim();
    if (IMG_HREF_RE.test(href)) add(href, a.textContent || "", contextFor(a));
  });

  // CSS background images on inline styles
  doc.querySelectorAll("[style]").forEach((el) => {
    const style = el.getAttribute("style") || "";
    const m = /background(?:-image)?\s*:[^;]*url\(\s*(['"]?)([^'")]+)\1\s*\)/i.exec(style);
    if (m && m[2]) add(m[2], "", contextFor(el));
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
      add(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`, title, contextFor(svg));
    }
  });

  const body = doc.body as (HTMLElement & { innerText?: string }) | null;
  const text = (body?.innerText || body?.textContent || "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { text, images };
}

/** Pulls image references out of a markdown / plain-text dump. */
export function parseMarkdownImages(md: string): ExtractedImage[] {
  const out: ExtractedImage[] = [];
  const seen = new Set<string>();
  const lines = md.split(/\r?\n/);
  let heading = "";

  const push = (rawSrc: string, alt: string, ctx: string) => {
    const s = rawSrc.trim().replace(/^<|>$/g, "");
    if (!s || seen.has(s)) return;
    if (!/^(https?:|\/\/|data:image\/)/i.test(s)) return;
    seen.add(s);
    out.push({
      src: s.startsWith("//") ? `https:${s}` : s,
      alt: alt.trim(),
      context: ctx.replace(/\s+/g, " ").trim().slice(0, 320),
    });
  };

  lines.forEach((line, i) => {
    const hm = /^#{1,6}\s+(.*)/.exec(line);
    if (hm) heading = hm[1] ?? "";
    const near = lines.slice(Math.max(0, i - 2), i + 1).join(" ");

    const mdImg = /!\[([^\]]*)\]\(\s*(<[^>]+>|[^)\s]+)(?:\s+["'][^"']*["'])?\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = mdImg.exec(line))) {
      const alt = m[1] ?? "";
      push(m[2] ?? "", alt, `${heading} ${near} ${alt}`);
    }

    const htmlImg = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
    while ((m = htmlImg.exec(line))) {
      const tag = m[0];
      const alt = /\balt=["']([^"']*)["']/i.exec(tag)?.[1] ?? "";
      push(m[1] ?? "", alt, `${heading} ${near} ${alt}`);
    }
  });

  return out;
}

/** Replaces heavy inline base64 image data with a placeholder so a dump can be
 *  sent to the model without blowing the token budget. */
export function stripInlineImageData(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\(\s*data:[^)]*\)/gi, "![$1](embedded-image)")
    .replace(/data:image\/[a-z0-9.+-]+;[^\s"')]{80,}/gi, "[embedded image]");
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
