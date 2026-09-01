import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  normalizeProfile,
  toPartnerRoles,
  type Company,
  type CompanyProfile,
  type Industry,
  type Partner,
  type PartnerRole,
} from "./research-types";

export const SETTING_KEYS = [
  "themes",
  "challenge_tags",
  "financial_tags",
  "initiative_areas",
  "engagement_stages",
  "illumine_models",
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];
export type StringSettingKey = Exclude<SettingKey, "themes">;

export type ThemeMood = "challenge" | "aspiration";
/** A challenge / aspiration theme with several example business contexts. */
export type Theme = {
  name: string;
  mood: ThemeMood;
  examples: string[];
};

export function toThemes(value: unknown): Theme[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((x): Theme => {
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        const mood: ThemeMood =
          String(o["mood"] ?? "").toLowerCase() === "aspiration" ? "aspiration" : "challenge";
        const examples = Array.isArray(o["examples"])
          ? (o["examples"] as unknown[]).map((e) => String(e).trim()).filter(Boolean)
          : [];
        return { name: String(o["name"] ?? o["title"] ?? "").trim(), mood, examples };
      }
      return { name: String(x).trim(), mood: "challenge", examples: [] };
    })
    .filter((t) => t.name);
}

export type SettingsMap = { themes: Theme[] } & Record<StringSettingKey, string[]>;

/** Used when a settings row has never been created (e.g. before the seed
 *  migration runs), so the editor dropdowns are never empty. */
export const SETTING_DEFAULTS: SettingsMap = {
  themes: [
    {
      name: "Preserving market leadership in a specific product / business line",
      mood: "challenge",
      examples: [
        "Defending a category the company itself created as competitors scale fast",
        "Holding share in the flagship product against aggressive new entrants",
      ],
    },
    {
      name: "Dealing with intense competition and a slipping market position",
      mood: "challenge",
      examples: [
        "Running a clear second to the #1 player in a core segment",
        "Reduced morale in the sales / channel organisation as share erodes",
      ],
    },
    {
      name: "Funding and executing aggressive growth / network expansion",
      mood: "aspiration",
      examples: [
        "Adding dealers and widening the retail network at pace",
        "Raising capital specifically to expand distribution",
      ],
    },
    {
      name: "Adding production capacity in new locations",
      mood: "aspiration",
      examples: ["New plants / lines opening up new dealer catchments"],
    },
    {
      name: "Building a future-ready talent and leadership pipeline",
      mood: "aspiration",
      examples: ["Capability building for frontline sales & service teams"],
    },
    {
      name: "Driving digital and technology transformation",
      mood: "aspiration",
      examples: ["Digitising lead generation and dealer operations end to end"],
    },
    {
      name: "Absorbing a compound external / operational shock",
      mood: "challenge",
      examples: ["A cyberattack, tariff regime or supply shock hitting a key subsidiary at once"],
    },
  ],
  challenge_tags: ["Company-wide business problem", "BU-specific"],
  financial_tags: ["High performing", "Moderate performing", "Low performing"],
  initiative_areas: [
    "Digital Transformation",
    "Sustainability",
    "Talent & Capability",
    "Customer Experience",
    "Manufacturing & Operations",
  ],
  engagement_stages: [
    "Initial conversation",
    "Proposal",
    "Pilot",
    "Delivery",
    "Post-delivery review",
  ],
  illumine_models: [
    "ME-Retailer Engagement App",
    "Market Discovery Tool",
    "Business Counselling Toolbox",
    "Scalable Business Coaching Toolbox",
    "Sustainable Learning System (for rapid upgradation)",
    "Flashpoints Management System",
    "Best Practices Toolbox",
    "Customer Discovery / Counselling App",
  ],
};

export const SETTING_LABELS: Record<StringSettingKey, { title: string; help: string }> = {
  challenge_tags: {
    title: "Challenge tags",
    help: "Scope tags shown next to each challenge, e.g. company-wide or BU-specific.",
  },
  financial_tags: {
    title: "Financial verdict tags",
    help: "Overall verdict options for the financials block.",
  },
  initiative_areas: {
    title: "Initiative areas",
    help: "Areas available in the company-level research table.",
  },
  engagement_stages: {
    title: "Engagement stages",
    help: "Stages used to track partner contributions.",
  },
  illumine_models: {
    title: "Illumine models & solutions",
    help: "Predefined models selectable under a vertical's “Illumine's potential contributions”. New models can be added here as they emerge.",
  },
};

export const industriesQuery = queryOptions({
  queryKey: ["industries"],
  queryFn: async (): Promise<Industry[]> => {
    const { data, error } = await supabase
      .from("industries")
      .select("id, name, code, sort_order")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Industry[];
  },
});

export const companyCountsQuery = queryOptions({
  queryKey: ["company-counts"],
  queryFn: async (): Promise<Record<string, number>> => {
    const { data, error } = await supabase.from("companies").select("industry_id");
    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.industry_id as string] = (counts[row.industry_id as string] ?? 0) + 1;
    }
    return counts;
  },
});

export const industryQuery = (id: string) =>
  queryOptions({
    queryKey: ["industry", id],
    queryFn: async (): Promise<Industry | null> => {
      const { data, error } = await supabase
        .from("industries")
        .select("id, name, code, sort_order")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as Industry) ?? null;
    },
  });

export const companiesQuery = (industryId: string) =>
  queryOptions({
    queryKey: ["companies", industryId],
    queryFn: async (): Promise<Company[]> => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, industry_id, name, tagline, profile, updated_at")
        .eq("industry_id", industryId)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...(row as unknown as Company),
        profile: normalizeProfile((row as { profile: unknown }).profile),
      }));
    },
  });

export const companyQuery = (id: string) =>
  queryOptions({
    queryKey: ["company", id],
    queryFn: async (): Promise<Company | null> => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, industry_id, name, tagline, profile, updated_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...(data as unknown as Company),
        profile: normalizeProfile((data as { profile: unknown }).profile),
      };
    },
  });

const STRING_SETTING_KEYS: StringSettingKey[] = [
  "challenge_tags",
  "financial_tags",
  "initiative_areas",
  "engagement_stages",
  "illumine_models",
];

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async (): Promise<SettingsMap> => {
    const { data, error } = await supabase.from("app_settings").select("key, value");
    if (error) throw error;
    const rows = new Map<string, unknown>();
    for (const row of data ?? []) rows.set(row.key as string, row.value);

    const listOf = (key: StringSettingKey): string[] => {
      if (!rows.has(key)) return [...SETTING_DEFAULTS[key]];
      const v = rows.get(key);
      return Array.isArray(v) ? (v as unknown[]).map((x) => String(x)) : [];
    };

    const map = { themes: [] } as unknown as SettingsMap;
    map.themes = rows.has("themes") ? toThemes(rows.get("themes")) : [...SETTING_DEFAULTS.themes];
    for (const key of STRING_SETTING_KEYS) map[key] = listOf(key);
    return map;
  },
});

export async function saveSetting(key: StringSettingKey, value: string[]) {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) throw error;
}

export async function saveThemes(themes: Theme[]) {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "themes", value: themes as never }, { onConflict: "key" });
  if (error) throw error;
}

export async function upsertIndustry(input: {
  id?: string;
  name: string;
  code: string;
  sort_order: number;
}) {
  const { error } = await supabase.from("industries").upsert(input);
  if (error) throw error;
}

export async function deleteIndustry(id: string) {
  const { error } = await supabase.from("industries").delete().eq("id", id);
  if (error) throw error;
}

export async function createCompany(input: {
  industry_id: string;
  name: string;
  tagline: string;
}) {
  const { data, error } = await supabase.from("companies").insert(input).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function saveCompany(input: {
  id: string;
  name: string;
  tagline: string;
  profile: CompanyProfile;
}) {
  const { error } = await supabase
    .from("companies")
    .update({ name: input.name, tagline: input.tagline, profile: input.profile as never })
    .eq("id", input.id);
  if (error) throw error;
}

export async function deleteCompany(id: string) {
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- partner profiles ---------------- */

export const partnersQuery = queryOptions({
  queryKey: ["partners"],
  queryFn: async (): Promise<Partner[]> => {
    const { data, error } = await supabase
      .from("partners")
      .select("id, name, photo_url, linkedin_url, experience, updated_at")
      .order("name", { ascending: true });
    // The `partners` table may not exist yet (migration pending) — degrade gracefully.
    if (error) {
      console.warn("partners query failed", error.message);
      return [];
    }
    return (data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r["id"] ?? ""),
        name: String(r["name"] ?? ""),
        photo_url: String(r["photo_url"] ?? ""),
        linkedin_url: String(r["linkedin_url"] ?? ""),
        experience: toPartnerRoles(r["experience"]),
        updated_at: String(r["updated_at"] ?? ""),
      };
    });
  },
});

export async function upsertPartner(input: {
  id?: string;
  name: string;
  photo_url: string;
  linkedin_url: string;
  experience: PartnerRole[];
}): Promise<string> {
  const row = {
    ...(input.id ? { id: input.id } : {}),
    name: input.name,
    photo_url: input.photo_url,
    linkedin_url: input.linkedin_url,
    experience: input.experience as never,
  };
  const { data, error } = await supabase.from("partners").upsert(row).select("id").single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function deletePartner(id: string) {
  const { error } = await supabase.from("partners").delete().eq("id", id);
  if (error) throw error;
}

const MEDIA_BUCKET = "company-media";

/** Uploads an image to public storage and returns its public URL. */
export async function uploadCompanyImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (PNG, JPG, SVG, …).");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Image is larger than 10 MB — please use a smaller file.");
  }
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const path = `benchmarks/${id}.${ext || "png"}`;

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    ...(file.type ? { contentType: file.type } : {}),
  });
  if (error) throw error;

  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}
