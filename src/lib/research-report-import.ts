/**
 * Deterministic importer for the "Company Research Report" HTML template
 * (the format Claude produces for this series). Runs entirely in the browser,
 * no AI / no credits. Returns null if the HTML isn't in that template.
 */
import {
  emptyProfile,
  emptyStakeholder,
  emptyVertical,
  type Challenge,
  type ChallengeContext,
  type ChallengeMood,
  type ChannelStat,
  type CompanyProfile,
  type Grade,
  type Initiative,
  type Quote,
  type SourceLink,
  type Stakeholder,
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

/** Serialises an element's text, wrapping <b>/<strong> spans in `**…**`. */
function boldMarked(el: Element): string {
  let out = "";
  el.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      out += node.textContent ?? "";
    } else if (node.nodeType === 1) {
      const child = node as unknown as Element;
      const inner = boldMarked(child);
      if (/^(?:b|strong)$/i.test(child.tagName)) {
        const t = inner.trim();
        out += t ? `**${t}**` : "";
      } else {
        out += inner;
      }
    }
  });
  return out.replace(/\s+/g, " ").trim();
}

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

  const takeawayItems = takeaway ? Array.from(takeaway.querySelectorAll("li")) : [];
  if (takeawayItems.length) {
    fin.insights = takeawayItems.map((li) => boldMarked(li)).filter(Boolean);
    fin.narrative = "";
  } else {
    fin.narrative = [
      clean(takeaway?.textContent).replace(/^[💡\s]+/, ""),
      clean(desc?.textContent),
    ]
      .filter(Boolean)
      .join(" ");
  }

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

  // Overall verdict — take it verbatim if the report states one, else derive it
  // from the company's revenue CAGR versus the industry's.
  const sectionText = nodes.map((n) => n.textContent || "").join(" ");
  const stated =
    /overall verdict[:\s-]*([^.\n<]{3,48})/i.exec(sectionText)?.[1] ||
    /\b((?:high|strong|moderately?|moderate|low|weak|under)[\s-]*performing)\b/i.exec(
      sectionText,
    )?.[1] ||
    "";
  const s = stated.toLowerCase();
  if (/high|strong/.test(s)) fin.verdict = "High performing";
  else if (/moderate/.test(s)) fin.verdict = "Moderate performing";
  else if (/low|weak|under/.test(s)) fin.verdict = "Low performing";

  if (!fin.verdict) {
    const co = parseFloat(fin.revenueCagr.replace(/[^\d.-]/g, ""));
    const ind = parseFloat(fin.industryCagr.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(co) && Number.isFinite(ind) && ind > 0) {
      if (co >= ind * 1.15) {
        fin.verdict = "High performing";
        fin.verdictNote = `Revenue CAGR ${fin.revenueCagr} is well ahead of the industry's ${fin.industryCagr}.`;
      } else if (co >= ind * 0.9) {
        fin.verdict = "Moderate performing";
        fin.verdictNote = `Revenue CAGR ${fin.revenueCagr} is broadly in line with the industry's ${fin.industryCagr}.`;
      } else {
        fin.verdict = "Low performing";
        fin.verdictNote = `Revenue CAGR ${fin.revenueCagr} trails the industry's ${fin.industryCagr}.`;
      }
    }
  }

  if (!fin.verdictNote) {
    const foot = nodes
      .flatMap((n) => Array.from(n.querySelectorAll(".foot-note")))
      .map((f) => block(f.textContent))
      .join("\n")
      .split("\n")[0];
    if (foot) fin.verdictNote = foot;
  }
}

function parseQuote(bq: Element): Quote {
  const cite = bq.querySelector("cite");
  const link = bq.querySelector("a.inline-src, a[href]");
  const linkText = clean(link?.textContent).replace(/^→\s*/, "");
  const by = clean(cite?.textContent)
    .replace(/^—\s*/, "")
    .replace(linkText, "")
    .replace(/[·|,\s]+$/, "")
    .trim();
  let text = block(bq.textContent);
  if (cite) text = text.replace(block(cite.textContent), "").trim();
  text = text.replace(/^["“”]+|["“”]+$/g, "").trim();
  return { text, by, sourceLabel: linkText, sourceUrl: (link?.getAttribute("href") || "").trim() };
}

function paragraphProblem(scope: Element): { problem: string; status: string; sources: SourceLink[] } {
  const paras = Array.from(scope.querySelectorAll("p"));
  let status = "";
  const parts: string[] = [];
  for (const p of paras) {
    const bold = clean(p.querySelector("b, strong")?.textContent);
    const body = textAfterLabel(p);
    if (/status/i.test(bold)) status = body;
    else parts.push(bold ? `${bold} ${body}` : body);
  }
  const sources = paras
    .flatMap((p) => inlineSources(p))
    .filter((s) => s.url)
    .filter((s, i, arr) => arr.findIndex((x) => x.url === s.url) === i);
  return { problem: parts.filter(Boolean).join("\n\n"), status, sources };
}

function parseChallenges(doc: Document): Challenge[] {
  return Array.from(doc.querySelectorAll(".theme-card")).map((card) => {
    const h4 = card.querySelector("h4");
    const tagEl = card.querySelector(".ca-tag");
    const tagHay = `${clean(tagEl?.textContent)} ${tagEl?.getAttribute("class") || ""}`.toLowerCase();
    const mood: ChallengeMood =
      !card.classList.contains("crisis") && /aspiration/.test(tagHay) ? "aspiration" : "challenge";

    let theme = clean(h4?.textContent);
    if (tagEl) theme = theme.replace(clean(tagEl.textContent), "").trim();
    theme = theme.replace(/^theme\s+[a-z0-9]+\s*[—–:-]\s*/i, "").trim();

    const contextEls = Array.from(card.querySelectorAll(".business-context"));

    const summary = Array.from(card.querySelectorAll(":scope > p"))
      .map((p) => block(p.textContent))
      .filter(Boolean)
      .join("\n\n");

    const toContext = (el: Element): ChallengeContext => {
      const { problem, status, sources } = paragraphProblem(el);
      return {
        label: clean(el.querySelector(".vlabel")?.textContent),
        title: clean(el.querySelector("h5")?.textContent),
        problem,
        status,
        quotes: Array.from(el.querySelectorAll("blockquote")).map(parseQuote),
        sources,
      };
    };

    let contexts: ChallengeContext[] = contextEls.map(toContext);
    if (!contexts.length) {
      const ctx = toContext(card);
      if (ctx.problem || ctx.quotes.length) contexts = [ctx];
    }

    return {
      theme: theme || clean(h4?.textContent),
      mood,
      summary: contextEls.length ? summary : "",
      contexts,
      tag: card.classList.contains("crisis") ? "External / operational shock" : "",
      sources: [],
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

  // New template: per-vertical stakeholder categories with profile cards.
  const catStakeholders: Stakeholder[] = [];
  section.querySelectorAll(".stakeholder-cat").forEach((catEl) => {
    const category = clean(catEl.querySelector("h6")?.textContent)
      .replace(/^\([ivxlcdm0-9]+\)\s*/i, "")
      .trim();
    catEl.querySelectorAll(".profile-card").forEach((pc) => {
      const k = emptyStakeholder();
      k.category = category;
      k.name = clean(pc.querySelector(".pname")?.textContent);
      k.role = clean(pc.querySelector(".ptitle")?.textContent);
      const flag = clean(
        pc.querySelector(".ptitle .since-flag, .ptitle .estimate-flag")?.textContent,
      );
      if (flag && k.role.endsWith(flag)) k.role = k.role.slice(0, -flag.length).trim();

      pc.querySelectorAll(".pdetail").forEach((d) => {
        const bold = clean(d.querySelector("b")?.textContent)
          .toLowerCase()
          .replace(/:$/, "")
          .trim();
        const body = block(d.textContent).replace(/^[\s\S]*?:\s*/, "").trim();
        const raw = block(d.textContent);
        const isNote =
          !bold &&
          ((d.getAttribute("style") || "").toLowerCase().includes("color") ||
            d.classList.contains("confirmed-flag") ||
            /^[⚠✔]/.test(raw));
        if (/^ug\b|undergrad|bachelor/.test(bold)) k.educationUG = body;
        else if (/^pg\b|postgrad|master/.test(bold)) k.educationPG = body;
        else if (/education/.test(bold)) {
          if (!k.educationUG) k.educationUG = body;
        } else if (/experience|prior/.test(bold)) k.experiencePrevious = body;
        else if (isNote) k.note = k.note ? `${k.note} ${raw}` : raw;
      });

      if (k.name || k.role) catStakeholders.push(k);
    });
  });

  if (catStakeholders.length) {
    v.stakeholders = catStakeholders;
  } else {
    const decision = section.querySelector(".decision-box");
    if (decision) {
      v.stakeholders = Array.from(decision.querySelectorAll("li"))
        .map((li): Stakeholder => {
          const nm = clean(li.querySelector("b, strong")?.textContent);
          let rest = block(li.textContent);
          if (nm && rest.startsWith(nm)) {
            rest = rest.slice(nm.length).replace(/^[\s—–:-]+/, "");
          }
          return { ...emptyStakeholder(), name: nm || rest, role: nm ? rest : "" };
        })
        .filter((k) => k.name || k.role);
    }
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
  const header = rows.shift();

  // Map columns by header text so any order works.
  const heads = header
    ? Array.from(header.querySelectorAll("th, td")).map((h) => clean(h.textContent).toLowerCase())
    : [];
  const find = (re: RegExp, fallback: number) => {
    const i = heads.findIndex((h) => re.test(h));
    return i === -1 ? fallback : i;
  };
  const col = {
    year: find(/year|introduced|since/, 3),
    area: find(/area/, 0),
    category: find(/category/, 1),
    initiative: find(/initiative|name/, 2),
    whatItDoes: find(/what/, 4),
    howItIsDone: find(/how/, 5),
  };

  profile.initiatives = rows
    .map((r): Initiative | null => {
      const c = Array.from(r.querySelectorAll("td"));
      if (c.length < 3) return null;
      return {
        year: clean(c[col.year]?.textContent),
        area: clean(c[col.area]?.textContent),
        category: clean(c[col.category]?.textContent),
        initiative: clean(c[col.initiative]?.textContent),
        whatItDoes: block(c[col.whatItDoes]?.textContent),
        howItIsDone: block(c[col.howItIsDone]?.textContent),
      };
    })
    .filter((x): x is Initiative => !!x && !!x.initiative);
}

function h2ForInitTable(doc: Document): Element | null {
  const h = h2For(doc, /initiative|company-level/i);
  return h ? (sectionNodes(h).find((n) => n.tagName === "TABLE") ?? null) : null;
}

export function parseResearchReport(
  html: string,
  options: { illumineModels?: string[] } = {},
): ReportImportResult | null {
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

  // Seed 1-2 sample Illumine contributions per vertical for the user to edit.
  const samples = (options.illumineModels ?? []).slice(0, 2);
  if (samples.length) {
    for (const v of profile.verticals) {
      if (v.contributions.length === 0) {
        v.contributions = samples.map((m) => ({ stakeholders: "", model: m, whatHappens: "" }));
      }
    }
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
