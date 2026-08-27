export type Grade = "good" | "warn" | "bad" | "none";

export type FinancialMetric = {
  name: string;
  values: string[];
  grades: Grade[];
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
};

export type Challenge = {
  theme: string;
  problem: string;
  quote: string;
  quoteBy: string;
  tag: string;
};

export type Vertical = {
  name: string;
  description: string;
  basicDetails: string;
  revenueDetails: string;
  stakeholders: string;
  engagementModel: string;
  contributions: string;
};

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
    financials: { ...fin, years, metrics },
    challenges: Array.isArray(p.challenges) ? p.challenges : [],
    verticals: Array.isArray(p.verticals) ? p.verticals : [],
    initiatives: Array.isArray(p.initiatives) ? p.initiatives : [],
    partnerContributions: Array.isArray(p.partnerContributions) ? p.partnerContributions : [],
  };
}
