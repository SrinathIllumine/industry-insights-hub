export type Grade = "good" | "warn" | "bad" | "none";

export type FinancialMetric = {
  name: string;
  values: string[];
  grades: Grade[];
};

/** A source the information was pulled from. */
export type SourceLink = {
  label: string;
  url: string;
};

/** A chart / graph that carries part of the financial narrative. */
export type FinancialChart = {
  title: string;
  imageUrl: string;
  /** The story this chart tells — one or two sentences. */
  caption: string;
};

export type Financials = {
  unit: string;
  years: string[];
  metrics: FinancialMetric[];
  revenueCagr: string;
  industryCagr: string;
  verdict: string;
  verdictNote: string;
  benchmarkImageUrl: string;
  benchmarkNote: string;
  /** Narrative-driving charts, shown prominently. */
  charts: FinancialChart[];
  /** ~2 lines of sense-making: where they stand financially and where headed. */
  narrative: string;
};

export type Challenge = {
  theme: string;
  /** A thorough, plain-language explanation of the problem. */
  problem: string;
  quote: string;
  quoteBy: string;
  tag: string;
  /** Where the problem / quote was pulled from. */
  sources: SourceLink[];
};

/** One Illumine model / solution mapped to a business vertical, with a note on
 *  how it could be configured for this specific company. */
export type IllumineContribution = {
  model: string;
  configuration: string;
};

/** A product / service / element that drives a meaningful share of a vertical's revenue. */
export type RevenueContributor = {
  name: string;
  /** Share / value / why it matters. */
  detail: string;
};

/** A single number in the channel-engagement "numbers" card, e.g.
 *  { label: "Dealers", value: "~14,000" }. */
export type ChannelStat = {
  label: string;
  value: string;
};

export type Vertical = {
  name: string;
  description: string;
  basicDetails: string;
  /** Optional free-text revenue narrative (kept for depth / legacy dumps). */
  revenueDetails: string;
  /** Headline revenue figure for the vertical, e.g. "₹4,200 Cr (FY24)". */
  revenueValue: string;
  /** Growth, e.g. "+12% YoY" or "3-yr CAGR 9%". */
  revenueGrowth: string;
  /** Major revenue contributors — products / services / elements of this vertical. */
  revenueContributors: RevenueContributor[];
  /** Readable bullet points — one stakeholder / group per line. */
  stakeholders: string[];
  /** Readable bullet points — channel engagement model, keep numbers legible. */
  engagementModel: string[];
  /** Image URL of a small stakeholder engagement map. */
  engagementMapUrl: string;
  /** Numbers card — dealers, dealer executives, salesforce, distributors… */
  channelStats: ChannelStat[];
  /** Types of dealers & channels active in this vertical. */
  dealerChannelTypes: string[];
  contributions: IllumineContribution[];
};

export const emptyVertical = (): Vertical => ({
  name: "",
  description: "",
  basicDetails: "",
  revenueDetails: "",
  revenueValue: "",
  revenueGrowth: "",
  revenueContributors: [],
  stakeholders: [],
  engagementModel: [],
  engagementMapUrl: "",
  channelStats: [],
  dealerChannelTypes: [],
  contributions: [],
});

/** Accepts a stored string[] or a legacy newline string and returns clean bullets. */
export function toBullets(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((s) => s.replace(/^\s*[-*•]\s*/, "").trim())
      .filter(Boolean);
  }
  return [];
}

function str(o: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    if (o[k] != null && o[k] !== "") return String(o[k]).trim();
  }
  return "";
}

export function toSources(value: unknown): SourceLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => {
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        return { label: str(o, "label", "title", "name"), url: str(o, "url", "href", "link") };
      }
      const s = String(x).trim();
      return { label: s, url: /^https?:\/\//i.test(s) ? s : "" };
    })
    .filter((s) => s.label || s.url)
    .map((s) => ({ label: s.label || s.url, url: s.url }));
}

export function toContributors(value: unknown): RevenueContributor[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => {
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        return { name: str(o, "name", "product", "element"), detail: str(o, "detail", "share", "note") };
      }
      return { name: String(x).trim(), detail: "" };
    })
    .filter((c) => c.name || c.detail);
}

export function toStats(value: unknown): ChannelStat[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => {
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        return { label: str(o, "label", "name", "type"), value: str(o, "value", "count", "number") };
      }
      return { label: String(x).trim(), value: "" };
    })
    .filter((s) => s.label || s.value);
}

/** Accepts stored IllumineContribution[] or a legacy free-text string. */
export function toContributions(value: unknown): IllumineContribution[] {
  if (Array.isArray(value)) {
    return value
      .map((x) => {
        if (x && typeof x === "object") {
          const o = x as Record<string, unknown>;
          return {
            model: String(o["model"] ?? "").trim(),
            configuration: String(o["configuration"] ?? o["config"] ?? "").trim(),
          };
        }
        return { model: String(x).trim(), configuration: "" };
      })
      .filter((c) => c.model || c.configuration);
  }
  if (typeof value === "string" && value.trim()) {
    return [{ model: "", configuration: value.trim() }];
  }
  return [];
}

function normalizeVertical(raw: unknown): Vertical {
  const v = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    name: str(v, "name"),
    description: str(v, "description"),
    basicDetails: str(v, "basicDetails"),
    revenueDetails: str(v, "revenueDetails"),
    revenueValue: str(v, "revenueValue", "revenue"),
    revenueGrowth: str(v, "revenueGrowth", "growth"),
    revenueContributors: toContributors(v["revenueContributors"] ?? v["contributors"]),
    stakeholders: toBullets(v["stakeholders"]),
    engagementModel: toBullets(v["engagementModel"]),
    engagementMapUrl: str(v, "engagementMapUrl", "engagementMap", "mapUrl"),
    channelStats: toStats(v["channelStats"] ?? v["channelNumbers"] ?? v["numbers"]),
    dealerChannelTypes: toBullets(v["dealerChannelTypes"] ?? v["dealerTypes"] ?? v["channelTypes"]),
    contributions: toContributions(v["contributions"]),
  };
}

function normalizeChallenge(raw: unknown): Challenge {
  const c = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    theme: str(c, "theme", "category"),
    problem: str(c, "problem", "explanation", "description"),
    quote: str(c, "quote"),
    quoteBy: str(c, "quoteBy", "quoteby", "by"),
    tag: str(c, "tag", "scope"),
    sources: toSources(c["sources"] ?? c["references"] ?? c["links"]),
  };
}

function normalizeCharts(value: unknown): FinancialChart[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => {
      const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
      return {
        title: str(o, "title", "name"),
        imageUrl: str(o, "imageUrl", "url", "src"),
        caption: str(o, "caption", "story", "note"),
      };
    })
    .filter((c) => c.title || c.imageUrl || c.caption);
}

export type Initiative = {
  area: string;
  category: string;
  initiative: string;
  whatItDoes: string;
  howItIsDone: string;
};

export type PartnerContribution = {
  date: string;
  stage: string;
  title: string;
  description: string;
};

export type CompanyProfile = {
  financials: Financials;
  challenges: Challenge[];
  verticals: Vertical[];
  initiatives: Initiative[];
  partnerContributions: PartnerContribution[];
};

export type Industry = {
  id: string;
  name: string;
  code: string;
  sort_order: number;
};

export type Company = {
  id: string;
  industry_id: string;
  name: string;
  tagline: string;
  profile: CompanyProfile;
  updated_at: string;
};

export const emptyFinancials = (): Financials => ({
  unit: "INR Cr",
  years: ["FY24", "FY25", "FY26"],
  metrics: [
    { name: "Revenue", values: ["", "", ""], grades: ["none", "none", "none"] },
    { name: "Net profit / loss", values: ["", "", ""], grades: ["none", "none", "none"] },
    { name: "EBITDA", values: ["", "", ""], grades: ["none", "none", "none"] },
    { name: "PAT", values: ["", "", ""], grades: ["none", "none", "none"] },
  ],
  revenueCagr: "",
  industryCagr: "",
  verdict: "",
  verdictNote: "",
  benchmarkImageUrl: "",
  benchmarkNote: "",
  charts: [],
  narrative: "",
});

export const emptyProfile = (): CompanyProfile => ({
  financials: emptyFinancials(),
  challenges: [],
  verticals: [],
  initiatives: [],
  partnerContributions: [],
});

/** Fills any missing part of a stored profile so the UI never crashes. */
export function normalizeProfile(raw: unknown): CompanyProfile {
  const base = emptyProfile();
  if (!raw || typeof raw !== "object") return base;
  const p = raw as Partial<CompanyProfile>;
  const fin = { ...base.financials, ...(p.financials ?? {}) } as Financials;
  const years = Array.isArray(fin.years) && fin.years.length ? fin.years : base.financials.years;
  const metrics = (Array.isArray(fin.metrics) ? fin.metrics : base.financials.metrics).map((m) => ({
    name: m?.name ?? "",
    values: years.map((_, i) => m?.values?.[i] ?? ""),
    grades: years.map((_, i) => (m?.grades?.[i] ?? "none") as Grade),
  }));
  return {
    financials: {
      ...fin,
      years,
      metrics,
      charts: normalizeCharts((fin as { charts?: unknown }).charts),
      narrative: typeof fin.narrative === "string" ? fin.narrative : "",
    },
    challenges: Array.isArray(p.challenges) ? p.challenges.map(normalizeChallenge) : [],
    verticals: Array.isArray(p.verticals) ? p.verticals.map(normalizeVertical) : [],
    initiatives: Array.isArray(p.initiatives) ? p.initiatives : [],
    partnerContributions: Array.isArray(p.partnerContributions) ? p.partnerContributions : [],
  };
}
