import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  normalizeProfile,
  type Company,
  type CompanyProfile,
  type Industry,
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
export type SettingsMap = Record<SettingKey, string[]>;

/** Used when a settings row has never been created (e.g. before the seed
 *  migration runs), so the editor dropdowns are never empty. */
export const SETTING_DEFAULTS: SettingsMap = {
  themes: [
    "Preserving market leadership in a specific product/business line",
    "Dealing with intense competition and potential loss of market position & reduced morale",
    "Increased funding for aggressive growth/expansion of business - more dealers/network growth",
    "Increase production capacity in new areas/locations leading to more dealers",
    "Building future-ready talent and leadership pipeline",
    "Driving digital and technology transformation",
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

export const SETTING_LABELS: Record<SettingKey, { title: string; help: string }> = {
  themes: {
    title: "Challenge themes",
    help: "The finite list of themes used in the Business Challenge / Aspiration block.",
  },
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

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async (): Promise<SettingsMap> => {
    const { data, error } = await supabase.from("app_settings").select("key, value");
    if (error) throw error;
    const seen = new Set<SettingKey>();
    const map = {} as SettingsMap;
    for (const key of SETTING_KEYS) map[key] = [];
    for (const row of data ?? []) {
      const key = row.key as SettingKey;
      if (SETTING_KEYS.includes(key)) {
        map[key] = Array.isArray(row.value) ? (row.value as string[]) : [];
        seen.add(key);
      }
    }
    // Fall back to sensible defaults for any list that has never been saved.
    for (const key of SETTING_KEYS) {
      if (!seen.has(key)) map[key] = [...SETTING_DEFAULTS[key]];
    }
    return map;
  },
});

export async function saveSetting(key: SettingKey, value: string[]) {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value }, { onConflict: "key" });
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
