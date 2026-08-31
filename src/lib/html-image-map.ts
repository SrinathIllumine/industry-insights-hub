import type { ExtractedImage } from "./html-import";
import type { CompanyProfile } from "./research-types";

const MAP_RE = /engagement\s*map|stakeholder\s*map|network\s*map/i;
const MIX_RE = /\b(mix|product mix|model mix|volume|segment split|revenue split|portfolio)\b/i;
const FIN_RE = /\b(narrative chart|financ|revenue|net profit|profit|ebitda|pat|cagr)\b/i;

function acronym(name: string): string {
  const caps = name.replace(/\(.*$/, "").match(/\b[A-Z][A-Za-z]*/g) ?? [];
  return caps
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function firstWord(name: string): string {
  return (name.match(/[A-Za-z]{4,}/)?.[0] ?? "").toLowerCase();
}

function mentions(im: ExtractedImage, verticalName: string): boolean {
  const hay = `${im.alt} ${im.context}`.toLowerCase();
  const ac = acronym(verticalName).toLowerCase();
  if (ac.length >= 2 && new RegExp(`\\b${ac}\\b`).test(hay)) return true;
  const fw = firstWord(verticalName);
  return fw.length >= 4 && hay.includes(fw);
}

/**
 * Places extracted HTML images into the right slots of a freshly-structured
 * profile: per-vertical engagement maps and mix charts (name-scoped first, then
 * in document order), the financial narrative chart, and anything left over as
 * extra financial charts.
 */
export function matchHtmlImages(
  profile: CompanyProfile,
  images: ExtractedImage[],
): CompanyProfile {
  if (!images.length) return profile;
  const next: CompanyProfile = structuredClone(profile);
  const pool = images.slice();

  const take = (pred: (im: ExtractedImage) => boolean): string => {
    const i = pool.findIndex(pred);
    if (i < 0) return "";
    const [img] = pool.splice(i, 1);
    return img ? img.src : "";
  };
  const hay = (im: ExtractedImage) => `${im.alt} ${im.context}`;

  // Pass 1 — name-scoped engagement map + mix chart per vertical
  for (const v of next.verticals) {
    if (!v.engagementMapUrl)
      v.engagementMapUrl = take((im) => MAP_RE.test(hay(im)) && mentions(im, v.name));
    if (!v.mixChartUrl)
      v.mixChartUrl = take(
        (im) => MIX_RE.test(hay(im)) && !MAP_RE.test(hay(im)) && mentions(im, v.name),
      );
  }
  // Pass 2 — remaining maps / mix charts in document order
  for (const v of next.verticals) {
    if (!v.engagementMapUrl) v.engagementMapUrl = take((im) => MAP_RE.test(hay(im)));
    if (!v.mixChartUrl)
      v.mixChartUrl = take((im) => MIX_RE.test(hay(im)) && !MAP_RE.test(hay(im)));
  }

  // Financial narrative chart
  const finSrc = take((im) => FIN_RE.test(hay(im)) && !MAP_RE.test(hay(im)));
  if (finSrc) {
    const first = next.financials.charts[0];
    if (!first) {
      next.financials.charts.push({
        title: "Financial narrative",
        imageUrl: finSrc,
        caption: next.financials.narrative || "",
      });
    } else if (!first.imageUrl) {
      first.imageUrl = finSrc;
    } else {
      next.financials.charts.push({ title: "Financial chart", imageUrl: finSrc, caption: "" });
    }
  }

  // Fill any AI-declared charts that still lack an image, then keep the rest
  for (const c of next.financials.charts) {
    if (!c.imageUrl) {
      const nextImg = pool.shift();
      if (nextImg) c.imageUrl = nextImg.src;
    }
  }
  for (const im of pool) {
    next.financials.charts.push({ title: im.alt || "Chart", imageUrl: im.src, caption: "" });
  }

  return next;
}

/**
 * Uploads any inline `data:` images referenced by the profile and swaps in the
 * hosted URLs, so the saved profile never carries a multi-MB data URI.
 */
export async function materializeProfileImages(
  profile: CompanyProfile,
  upload: (dataUrl: string) => Promise<string>,
): Promise<CompanyProfile> {
  const next: CompanyProfile = structuredClone(profile);
  const cache = new Map<string, string>();

  const swap = async (url: string): Promise<string> => {
    if (!url || !/^data:/i.test(url)) return url;
    const cached = cache.get(url);
    if (cached !== undefined) return cached;
    let out = "";
    try {
      out = await upload(url);
    } catch {
      out = "";
    }
    cache.set(url, out);
    return out;
  };

  next.financials.benchmarkImageUrl = await swap(next.financials.benchmarkImageUrl);
  for (const c of next.financials.charts) c.imageUrl = await swap(c.imageUrl);
  next.financials.charts = next.financials.charts.filter(
    (c) => c.imageUrl || c.title || c.caption,
  );
  for (const v of next.verticals) {
    v.mixChartUrl = await swap(v.mixChartUrl);
    v.engagementMapUrl = await swap(v.engagementMapUrl);
  }
  return next;
}
