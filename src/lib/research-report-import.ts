/**
 * Deterministic importer for the "Company Research Report" HTML template
 * (the format Claude produces for this series). Runs entirely in the browser,
 * no AI / no credits. Returns null if the HTML isn't in that template.
 */
import {
  emptyProfile,
  emptyVertical,
  type Challenge,
  type ChannelStat,
  type CompanyProfile,
  type Grade,
  type Quote,
  type Vertical,
} from "./research-types";

export type ReportImportResult = {
  name: string;
  tagline: string;
  profile: CompanyProfile;
};

// JS \s already matches U+00A0, so clean() needs no special-casing.
const clean = (s: string | null | undefined): string => (s ?? "").replace(/\s+/g, " ").trim();

const NBSP = String.fromCharCode(0xa0);

const block = (s: string | null | undefined): string =>
  (s ?? "")
    .split(NBSP)
    .join(" ")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export function looksLikeResearchReport(html: string): boolean {
  return (
    /class="(?:theme-card|vertical-section|narrative-chart|decision-box)"/i.test(html) ||
    /class="cat-pill /i.test(html) ||
    /<h2[^>]*>\s*Block\s*\d/i.test(html)
  );
}

function imgSrc(el: Element | null | undefined): string {
  const s = (el?.getAttribute("src") || "").trim();
  return /^(?:https?:|data:image\/)/i.test(s) ? s : "";
}

function gradeOf(value: string): Grade {
  const t = value.trim();
  if (!t || /^[—–-]$/.test(t) || /^n\/?a$/i.test(t)) return "none";
  if (/^\(.*\)$/.test(t) || /^-\s*\d/.test(t) || /loss/i.test(t)) return "bad";
  return "good";
}

/** Text of an element with its leading "<b>Label:</b>" stripped. */
function textAfterLabel(el: Element): string {
  const bold = clean(el.querySelector("b, strong")?.textContent);
  let text = block(el.textContent);
  if (bold && text.startsWith(bold)) text = text.slice(bold.length).replace(/^[\s:—-]+/, "");
  return text.trim();
}

function inlineSources(el: Element): { label: string; url: string }[] {
  return Array.from(el.querySelectorAll("a.inline-src, a[href]")).map((a) => ({
    label: clean(a.textContent).replace(/^→\s*/, ""),
    url: (a.getAttribute("href") || "").trim(),
  }));
}

function h2For(doc: Document, re: RegExp): Element | null {
  return Array.from(doc.querySelectorAll("h2")).find((h) => re.test(clean(h.textContent))) ?? null;
}

/** Everything between `start` and the next matching sibling / heading. */
function sectionNodes(start: Element | null, stopTag = "H2"): Element[] {
  const out: Element[] = [];
  let n = start?.nextElementSibling ?? null;
  while (n && n.tagName !== stopTag) {
    out.push(n);
    n = n.nextElementSibling;
  }
  return out;
}

function parseFinancials(doc: Document, profile: CompanyProfile) {
  const fin = profile.financials;
  const start = h2For(doc, /financ/i);
  if (!start) return;
  const nodes = sectionNodes(start);

  const desc = nodes.find((n) => n.classList.contains("block-desc"));
  const takeaway = nodes.find((n) => n.classList.contains("takeaway"));
  const chart = nodes.find(
    (n) => n.tagName === "IMG" && n.classList.contains("narrative-chart"),
  ) as HTMLImageElement | undefined;

  const narrativeParts = [
    clean(takeaway?.textContent).replace(/^[💡\s]+/, ""),
    clean(desc?.textContent),
  ].filter(Boolean);
  fin.narrative = narrativeParts.join(" ");

  if (chart) {
    fin.charts = [
      {
        title: clean(chart.getAttribute("alt")) || "Financial narrative",
        imageUrl: imgSrc(chart),
        caption: clean(desc?.textContent),
      },
    ];
  }

  // CAGR stat pills
  doc.querySelectorAll(".stat-row .stat-pill, .stat-pill").forEach((pill) => {
    const t = clean(pill.textContent);
    const m = /([~\d][\d.,]*\s*%)/.exec(t);
    const value = (m?.[1] ?? "").replace(/\s+/g, "");
    if (!value) return;
    if (/industry|sector/i.test(t)) fin.industryCagr = value;
    else if (/cagr|revenue/i.test(t)) fin.revenueCagr = value;
  });

  // Metrics table — the first table inside the financials modal / section
  const table =
    doc.querySelector("#finModal table") ||
    nodes.flatMap((n) => Array.from(n.querySelectorAll("table")))[0] ||
    null;
  if (table) {
    const rows = Array.from(table.querySelectorAll("tr"));
    const header = rows.shift();
    const years = header
      ? Array.from(header.querySelectorAll("th, td"))
          .slice(1)
          .map((c) => clean(c.textContent))
          .filter(Boolean)
      : [];
    if (years.length) {
      fin.years = years;
      fin.metrics = rows
        .map((r) => {
          const cells = Array.from(r.querySelectorAll("th, td"));
          const name = clean(cells[0]?.textContent);
          const values = years.map((_, i) => clean(cells[i + 1]?.textContent));
          return { name, values, grades: values.map(gradeOf) };
        })
        .filter((m) => m.name);
    }
  }

  const foot = nodes
    .flatMap((n) => Array.from(n.querySelectorAll(".foot-note")))
    .map((f) => block(f.textContent))
    .join("\n");
  if (foot) fin.verdictNote = foot;
}

function parseChallenges(doc: Document): Challenge[] {
  return Array.from(doc.querySelectorAll(".theme-card")).map((card) => {
    const theme = clean(card.querySelector("h4")?.textContent);
    const paras = Array.from(card.querySelectorAll(":scope > p"));

    let status = "";
    const problemParts: string[] = [];
    for (const p of paras) {
      const label = clean(p.querySelector("b, strong")?.textContent).toLowerCase();
      const body = textAfterLabel(p);
      if (/status/.test(label)) status = body;
      else problemParts.push(label ? `${clean(p.querySelector("b, strong")?.textContent)} ${body}` : body);
    }

    const quotes: Quote[] = Array.from(card.querySelectorAll("blockquote")).map((bq) => {
      const cite = bq.querySelector("cite");
      const link = bq.querySelector("a.inline-src, a[href]");
      const citeText = clean(cite?.textContent).replace(/^—\s*/, "");
      const linkText = clean(link?.textContent).replace(/^→\s*/, "");
      const by = citeText
        .replace(linkText, "")
        .replace(/[·|,\s]+$/, "")
        .trim();
      let text = block(bq.textContent);
      if (cite) text = text.replace(block(cite.textContent), "").trim();
      text = text.replace(/^["“”]+|["“”]+$/g, "").trim();
      return {
        text,
        by,
        sourceLabel: linkText,
        sourceUrl: (link?.getAttribute("href") || "").trim(),
      };
    });

    const sources = paras
      .flatMap((p) => inlineSources(p))
      .filter((s) => s.url)
      .filter((s, i, arr) => arr.findIndex((x) => x.url === s.url) === i);

    return {
      theme,
      problem: problemParts.filter(Boolean).join("\n\n"),
      status,
      quotes,
      tag: card.classList.contains("crisis") ? "External / operational shock" : "",
      sources,
    };
  });
}

function parseVertical(section: Element): Vertical {
  const v = emptyVertical();
  v.name = clean(section.querySelector(".vertical-header h3, h3")?.textContent).replace(
    /^\d+(?:\.\d+)?\s*[.)-]?\s*/,
    "",
  );
  v.shareOfRevenue = clean(section.querySelector(".badge")?.textContent);
  v.revenueValue = clean(section.querySelector(".rev-figures .big, .big")?.textContent);
  v.revenueDetails = block(section.querySelector(".rev-figures .sub, .sub")?.textContent);

  const contrib = section.querySelector(".contrib-note");
  if (contrib) v.revenueInsight = textAfterLabel(contrib);

  v.mixChartUrl = imgSrc(section.querySelector("img.mix-img"));

  const channelHeading = Array.from(section.querySelectorAll("h4")).find((h) =>
    /channel engagement/i.test(clean(h.textContent)),
  );
  if (channelHeading) {
    const t = clean(channelHeading.textContent);
    const m = /channel engagement\s*[—–-]\s*(.+)$/i.exec(t);
    v.channelModelName = (m?.[1] ?? "").trim();
  }

  const decision = section.querySelector(".decision-box");
  if (decision) {
    v.stakeholders = Array.from(decision.querySelectorAll("li")).map((li) => block(li.textContent));
  }

  section.querySelectorAll(".card").forEach((card) => {
    const h5 = clean(card.querySelector("h5")?.textContent).toLowerCase();
    if (/engagement map/.test(h5)) {
      v.engagementMapUrl = imgSrc(card.querySelector("img"));
    } else if (/dealer|executive|salesforce|retailer|reach|network/.test(h5)) {
      const stats: ChannelStat[] = Array.from(card.querySelectorAll(".metric-card")).map((mc) => ({
        value: clean(mc.querySelector(".num")?.textContent),
        label: clean(mc.querySelector(".label")?.textContent),
      }));
      v.channelStats = stats.filter((s) => s.label || s.value);
    }
  });

  const methodology = section.querySelector(".methodology, p.methodology");
  if (methodology) v.channelMethodology = textAfterLabel(methodology);

  return v;
}

function parseVerticals(doc: Document, profile: CompanyProfile) {
  const start = h2For(doc, /business vertical|vertical/i);
  if (start) {
    const nodes = sectionNodes(start);
    const desc = nodes.find((n) => n.classList.contains("block-desc"));
    if (desc) profile.verticalsNote = textAfterLabel(desc);
    const overview = nodes.find(
      (n) => n.tagName === "IMG" && n.classList.contains("narrative-chart"),
    ) as HTMLImageElement | undefined;
    if (overview) {
      profile.verticalsImageUrl = imgSrc(overview);
      profile.verticalsImageCaption = clean(overview.getAttribute("alt"));
    }
  }
  profile.verticals = Array.from(doc.querySelectorAll(".vertical-section")).map(parseVertical);
}

function parseInitiatives(doc: Document, profile: CompanyProfile) {
  const table = doc.querySelector("table.init-table") || h2ForInitTable(doc);
  if (!table) return;
  const rows = Array.from(table.querySelectorAll("tr"));
  rows.shift(); // header
  profile.initiatives = rows
    .map((r) => {
      const c = Array.from(r.querySelectorAll("td"));
      if (c.length < 3) return null;
      return {
        area: clean(c[0]?.textContent),
        category: clean(c[1]?.textContent),
        initiative: clean(c[2]?.textContent),
        whatItDoes: block(c[3]?.textContent),
        howItIsDone: block(c[4]?.textContent),
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x && !!x.initiative);
}

function h2ForInitTable(doc: Document): Element | null {
  const h = h2For(doc, /initiative|company-level/i);
  return h ? (sectionNodes(h).find((n) => n.tagName === "TABLE") ?? null) : null;
}

export function parseResearchReport(html: string): ReportImportResult | null {
  if (typeof DOMParser === "undefined" || !looksLikeResearchReport(html)) return null;

  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, .modal-close, .btn").forEach((n) => n.remove());

  const profile = emptyProfile();
  try {
    parseFinancials(doc, profile);
    profile.challenges = parseChallenges(doc);
    parseVerticals(doc, profile);
    parseInitiatives(doc, profile);
  } catch {
    return null;
  }

  const filled =
    profile.challenges.length > 0 ||
    profile.verticals.length > 0 ||
    profile.initiatives.length > 0 ||
    profile.financials.metrics.some((m) => m.values.some(Boolean));
  if (!filled) return null;

  const name = clean(doc.querySelector("h1")?.textContent)
    .replace(/\s*[—–-]\s*Company Research Report.*$/i, "")
    .trim();
  const tagline = clean(doc.querySelector(".subtitle")?.textContent).slice(0, 400);

  return { name, tagline, profile };
}
