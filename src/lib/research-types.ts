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

/** A stakeholder quote tied to a challenge, with its own source. */
export type Quote = {
  text: string;
  by: string;
  sourceLabel: string;
  sourceUrl: string;
};

export type ChallengeMood = "challenge" | "aspiration" | "";

/** One problem / business context under a challenge. A challenge can have several. */
export type ChallengeContext = {
  /** Which business / vertical this context belongs to, e.g. "Passenger Vehicles". */
  label: string;
  /** The specific framing of the problem in this context. */
  title: string;
  /** A thorough, plain-language explanation. */
  problem: string;
  /** Short "where this stands right now" line. */
  status: string;
  quotes: Quote[];
  sources: SourceLink[];
};

export const emptyChallengeContext = (): ChallengeContext => ({
  label: "",
  title: "",
  problem: "",
  status: "",
  quotes: [],
  sources: [],
});

export type Challenge = {
  /** The theme name (from the configured themes list). */
  theme: string;
  /** Whether this reads as a challenge or an aspiration. */
  mood: ChallengeMood;
  /** The overall recurring pattern across the contexts below. */
  summary: string;
  /** One or more problems / business contexts. */
  contexts: ChallengeContext[];
  tag: string;
  /** Challenge-level source links. */
  sources: SourceLink[];
};

/** One Illumine model / solution mapped to a business vertical. */
export type IllumineContribution = {
  /** The stakeholder(s) involved, or the engagement between stakeholders — one field. */
  stakeholders: string;
  /** Name of the model / system. */
  model: string;
  /** What happens here. */
  whatHappens: string;
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

/** Suggested stakeholder categories (free text is also allowed). */
export const STAKEHOLDER_CATEGORIES = [
  "Management stakeholder",
  "Business head",
  "Functional head — CHRO / HR",
  "Functional head — Sales & Marketing",
  "Functional head — other",
] as const;

/** A decision-making stakeholder inside a business vertical. */
export type Stakeholder = {
  name: string;
  role: string;
  photoUrl: string;
  /** e.g. Management stakeholder / Business head / Functional head. */
  category: string;
  /** Where they sit in the org hierarchy (e.g. "Reports to the Group CEO"). */
  hierarchy: string;
  educationUG: string;
  educationPG: string;
  /** Current job / mandate. */
  experienceCurrent: string;
  /** Previous roles & companies. */
  experiencePrevious: string;
  /** Caveats / confirmation notes. */
  note: string;
};

export const emptyStakeholder = (): Stakeholder => ({
  name: "",
  role: "",
  category: "",
  note: "",
  photoUrl: "",
  hierarchy: "",
  educationUG: "",
  educationPG: "",
  experienceCurrent: "",
  experiencePrevious: "",
});

export type Vertical = {
  name: string;
  description: string;
  basicDetails: string;
  /** e.g. "~20% of group revenue". */
  shareOfRevenue: string;
  /** Optional free-text revenue narrative (kept for depth / legacy dumps). */
  revenueDetails: string;
  /** Headline revenue figure for the vertical, e.g. "₹4,200 Cr (FY24)". */
  revenueValue: string;
  /** Growth, e.g. "+12% YoY" or "3-yr CAGR 9%". */
  revenueGrowth: string;
  /** The non-obvious insight about what really drives this vertical's revenue. */
  revenueInsight: string;
  /** Major revenue contributors — products / services / elements of this vertical. */
  revenueContributors: RevenueContributor[];
  /** Image URL of a product / volume / revenue mix chart for this vertical. */
  mixChartUrl: string;
  mixChartCaption: string;
  /** e.g. "Dealer Franchise Model (dominant channel)". */
  channelModelName: string;
  /** Decision-making stakeholders. */
  stakeholders: Stakeholder[];
  /** Readable bullet points — how the channel engagement works. */
  engagementModel: string[];
  /** Image URL of a small stakeholder engagement map. */
  engagementMapUrl: string;
  /** Numbers card — dealers, dealer executives, salesforce, distributors… */
  channelStats: ChannelStat[];
  /** How the estimated numbers were derived. */
  channelMethodology: string;
  /** Types of dealers & channels active in this vertical. */
  dealerChannelTypes: string[];
  contributions: IllumineContribution[];
};

export const emptyVertical = (): Vertical => ({
  name: "",
  description: "",
  basicDetails: "",
  shareOfRevenue: "",
  revenueDetails: "",
  revenueValue: "",
  revenueGrowth: "",
  revenueInsight: "",
  revenueContributors: [],
  mixChartUrl: "",
  mixChartCaption: "",
  channelModelName: "",
  stakeholders: [],
  engagementModel: [],
  engagementMapUrl: "",
  channelStats: [],
  channelMethodology: "",
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

export function toQuotes(value: unknown): Quote[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => {
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        return {
          text: str(o, "text", "quote"),
          by: str(o, "by", "quoteBy", "author", "role"),
          sourceLabel: str(o, "sourceLabel", "source", "publication"),
          sourceUrl: str(o, "sourceUrl", "url", "link", "href"),
        };
      }
      return { text: String(x).trim(), by: "", sourceLabel: "", sourceUrl: "" };
    })
    .filter((q) => q.text);
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

export function toStakeholders(value: unknown): Stakeholder[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((x): Stakeholder => {
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        return {
          name: str(o, "name"),
          role: str(o, "role", "title", "designation"),
          photoUrl: str(o, "photoUrl", "photo", "image", "pic"),
          category: str(o, "category", "group", "type"),
          hierarchy: str(o, "hierarchy", "position", "level", "reportsTo"),
          educationUG: str(o, "educationUG", "ug", "undergrad", "bachelors"),
          educationPG: str(o, "educationPG", "pg", "postgrad", "masters"),
          experienceCurrent: str(o, "experienceCurrent", "current", "currentRole"),
          experiencePrevious: str(o, "experiencePrevious", "previous", "priorRoles", "past"),
          note: str(o, "note", "caveat", "confirmation"),
        };
      }
      // Legacy "Name — role — context" bullet string.
      const parts = String(x)
        .trim()
        .split(/\s*[—–-]\s*/);
      const [name, ...rest] = parts;
      return {
        ...emptyStakeholder(),
        name: (name ?? "").trim(),
        role: rest.join(" — ").trim(),
      };
    })
    .filter((k) => k.name || k.role);
}

/** Accepts stored IllumineContribution[] (new or legacy shapes) or a free-text string. */
export function toContributions(value: unknown): IllumineContribution[] {
  if (Array.isArray(value)) {
    return value
      .map((x) => {
        if (x && typeof x === "object") {
          const o = x as Record<string, unknown>;
          return {
            stakeholders: str(o, "stakeholders", "engagement", "who"),
            model: str(o, "model", "system", "solution"),
            whatHappens: str(o, "whatHappens", "what", "configuration", "config"),
          };
        }
        return { stakeholders: "", model: String(x).trim(), whatHappens: "" };
      })
      .filter((c) => c.stakeholders || c.model || c.whatHappens);
  }
  if (typeof value === "string" && value.trim()) {
    return [{ stakeholders: "", model: "", whatHappens: value.trim() }];
  }
  return [];
}

function normalizeVertical(raw: unknown): Vertical {
  const v = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    name: str(v, "name"),
    description: str(v, "description"),
    basicDetails: str(v, "basicDetails"),
    shareOfRevenue: str(v, "shareOfRevenue", "revenueShare", "share"),
    revenueDetails: str(v, "revenueDetails"),
    revenueValue: str(v, "revenueValue", "revenue"),
    revenueGrowth: str(v, "revenueGrowth", "growth"),
    revenueInsight: str(v, "revenueInsight", "revenueContributorInsight", "insight"),
    revenueContributors: toContributors(v["revenueContributors"] ?? v["contributors"]),
    mixChartUrl: str(v, "mixChartUrl", "mixChart", "chartUrl"),
    mixChartCaption: str(v, "mixChartCaption", "chartCaption"),
    channelModelName: str(v, "channelModelName", "channelModel", "engagementModelName"),
    stakeholders: toStakeholders(v["stakeholders"] ?? v["decisionMakers"]),
    engagementModel: toBullets(v["engagementModel"] ?? v["engagementSteps"]),
    engagementMapUrl: str(v, "engagementMapUrl", "engagementMap", "mapUrl"),
    channelStats: toStats(v["channelStats"] ?? v["channelNumbers"] ?? v["numbers"]),
    channelMethodology: str(v, "channelMethodology", "methodology"),
    dealerChannelTypes: toBullets(v["dealerChannelTypes"] ?? v["dealerTypes"] ?? v["channelTypes"]),
    contributions: toContributions(v["contributions"]),
  };
}

function normalizeChallengeContext(raw: unknown): ChallengeContext {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const quotes = toQuotes(o["quotes"]);
  const legacyQuote = str(o, "quote");
  if (!quotes.length && legacyQuote) {
    quotes.push({ text: legacyQuote, by: str(o, "quoteBy", "by"), sourceLabel: "", sourceUrl: "" });
  }
  return {
    label: str(o, "label", "context", "vertical", "businessContext"),
    title: str(o, "title", "name", "framing", "headline"),
    problem: str(o, "problem", "explanation", "description", "what"),
    status: str(o, "status", "currentStatus"),
    quotes,
    sources: toSources(o["sources"] ?? o["references"] ?? o["links"]),
  };
}

function normalizeChallenge(raw: unknown): Challenge {
  const c = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  let contexts = Array.isArray(c["contexts"])
    ? (c["contexts"] as unknown[])
        .map(normalizeChallengeContext)
        .filter((x) => x.problem || x.title || x.label || x.quotes.length)
    : [];

  // Migrate a legacy single-problem challenge into one context.
  if (!contexts.length) {
    const legacy = normalizeChallengeContext({
      label: str(c, "themeExample", "example", "context"),
      problem: str(c, "problem", "explanation", "description"),
      status: str(c, "status", "currentStatus"),
      quotes: c["quotes"],
      quote: str(c, "quote"),
      quoteBy: str(c, "quoteBy", "by"),
    });
    if (legacy.problem || legacy.quotes.length || legacy.label) contexts = [legacy];
  }

  const moodRaw = str(c, "mood").toLowerCase();
  const mood: ChallengeMood =
    moodRaw === "aspiration" ? "aspiration" : moodRaw === "challenge" ? "challenge" : "";

  return {
    theme: str(c, "theme", "category"),
    mood,
    summary: str(c, "summary", "overview", "pattern"),
    contexts,
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
  /** Year the initiative was introduced. */
  year: string;
  area: string;
  category: string;
  initiative: string;
  whatItDoes: string;
  howItIsDone: string;
};

function normalizeInitiatives(value: unknown): Initiative[] {
  if (!Array.isArray(value)) return [];
  return value.map((x) => {
    const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
    return {
      year: str(o, "year", "introduced", "since"),
      area: str(o, "area"),
      category: str(o, "category"),
      initiative: str(o, "initiative", "name"),
      whatItDoes: str(o, "whatItDoes", "what"),
      howItIsDone: str(o, "howItIsDone", "how"),
    };
  });
}

/** Engagement timeline entry (initial conversations → delivery). */
export type PartnerContribution = {
  date: string;
  stage: string;
  title: string;
  description: string;
};

/** A reusable partner profile, stored in the `partners` table. */
export type PartnerRole = {
  organisation: string;
  role: string;
  period: string;
};

export type Partner = {
  id: string;
  name: string;
  photo_url: string;
  linkedin_url: string;
  experience: PartnerRole[];
  updated_at: string;
};

export function toPartnerRoles(value: unknown): PartnerRole[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => {
      const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
      return {
        organisation: str(o, "organisation", "organization", "company", "org"),
        role: str(o, "role", "title", "designation"),
        period: str(o, "period", "years", "duration", "when"),
      };
    })
    .filter((r) => r.organisation || r.role || r.period);
}

export type CompanyProfile = {
  financials: Financials;
  challenges: Challenge[];
  /** Optional framing note shown above the business verticals. */
  verticalsNote: string;
  /** Optional overview image for the whole Business Verticals block (e.g. group revenue split). */
  verticalsImageUrl: string;
  verticalsImageCaption: string;
  verticals: Vertical[];
  initiatives: Initiative[];
  /** IDs of partner profiles mapped to this company. */
  associatedPartnerIds: string[];
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
  verticalsNote: "",
  verticalsImageUrl: "",
  verticalsImageCaption: "",
  verticals: [],
  initiatives: [],
  associatedPartnerIds: [],
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
    verticalsNote: typeof p.verticalsNote === "string" ? p.verticalsNote : "",
    verticalsImageUrl: typeof p.verticalsImageUrl === "string" ? p.verticalsImageUrl : "",
    verticalsImageCaption:
      typeof p.verticalsImageCaption === "string" ? p.verticalsImageCaption : "",
    verticals: Array.isArray(p.verticals) ? p.verticals.map(normalizeVertical) : [],
    initiatives: normalizeInitiatives(p.initiatives),
    associatedPartnerIds: Array.isArray(p.associatedPartnerIds)
      ? p.associatedPartnerIds.filter((x): x is string => typeof x === "string" && !!x)
      : [],
    partnerContributions: Array.isArray(p.partnerContributions) ? p.partnerContributions : [],
  };
}
