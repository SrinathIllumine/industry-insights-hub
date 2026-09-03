import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** One company plotted on a growth-vs-profitability matrix. */
export type SnapshotPoint = {
  x: number;
  y: number;
  /** Revenue in the chart's unit (drives bubble size). */
  rev: number;
  label: string;
  /** Free text shown in the hover tooltip explaining the data basis. */
  note: string;
};

/** A single bubble matrix (one per business vertical / segment). */
export type SnapshotChart = {
  title: string;
  footnote: string;
  xLabel: string;
  yLabel: string;
  xDivider: number;
  yDivider: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  points: SnapshotPoint[];
};

export type IndustrySnapshot = {
  /** e.g. "Direct to Retailer / Franchisee Owner / Dealer model". */
  dominantModels: string[];
  /** Optional framing paragraph shown above the matrices. */
  intro: string;
  charts: SnapshotChart[];
  updated_at: string;
};

const KEY = (industryId: string) => `industry_snapshot:${industryId}`;

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function num(s: string | undefined | null): number {
  if (s == null) return 0;
  const n = parseFloat(String(s).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((x) => String(x).trim()).filter(Boolean);
  return [];
}

function normalizePoint(x: unknown): SnapshotPoint {
  const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  return {
    x: num(String(o["x"] ?? "")),
    y: num(String(o["y"] ?? "")),
    rev: num(String(o["rev"] ?? o["revenue"] ?? "")),
    label: String(o["label"] ?? o["l"] ?? "").trim(),
    note: String(o["note"] ?? "").trim(),
  };
}

function normalizeChart(x: unknown): SnapshotChart {
  const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  return {
    title: String(o["title"] ?? "").trim(),
    footnote: String(o["footnote"] ?? "").trim(),
    xLabel: String(o["xLabel"] ?? "3-year Revenue CAGR (%)").trim(),
    yLabel: String(o["yLabel"] ?? "Net Profit Margin (%)").trim(),
    xDivider: num(String(o["xDivider"] ?? "0")),
    yDivider: num(String(o["yDivider"] ?? "0")),
    xMin: num(String(o["xMin"] ?? "0")),
    xMax: num(String(o["xMax"] ?? "100")),
    yMin: num(String(o["yMin"] ?? "0")),
    yMax: num(String(o["yMax"] ?? "100")),
    points: Array.isArray(o["points"]) ? (o["points"] as unknown[]).map(normalizePoint) : [],
  };
}

export function normalizeSnapshot(value: unknown): IndustrySnapshot {
  const o = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    dominantModels: toStringList(o["dominantModels"]),
    intro: String(o["intro"] ?? "").trim(),
    charts: Array.isArray(o["charts"]) ? (o["charts"] as unknown[]).map(normalizeChart) : [],
    updated_at: String(o["updated_at"] ?? ""),
  };
}

export function emptySnapshot(): IndustrySnapshot {
  return { dominantModels: [], intro: "", charts: [], updated_at: "" };
}

/* ------------------------------------------------------------------ *
 * Parser for the "bubble matrix" HTML export.
 *
 * The export renders each vertical with:
 *   <div class="chart-block"><h2>Title</h2> … <div class="footnote">…</div></div>
 * and a script that declares `const xxPoints = [ { x:…, y:…, rev:…, l:'…', note:'…' }, … ]`
 * then calls
 *   renderBubbleMatrix('xxChart', xxPoints, XD, YD, XMIN, XMAX, YMIN, YMAX)
 * ------------------------------------------------------------------ */

function parsePointsArray(html: string, varName: string): SnapshotPoint[] {
  const re = new RegExp(
    "(?:const|let|var)\\s+" + varName.replace(/[^A-Za-z0-9_$]/g, "") + "\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*;",
  );
  const body = re.exec(html)?.[1];
  if (!body) return [];
  const objs = body.match(/\{[^{}]*\}/g) ?? [];
  return objs
    .map((raw): SnapshotPoint => {
      const g = (k: string) => new RegExp(k + "\\s*:\\s*(-?[0-9.]+)").exec(raw)?.[1];
      const s = (k: string) =>
        new RegExp(k + "\\s*:\\s*(?:'([^']*)'|\"([^\"]*)\")").exec(raw);
      const lm = s("l") ?? s("label");
      const nm = s("note");
      return {
        x: num(g("x")),
        y: num(g("y")),
        rev: num(g("rev")),
        label: clean((lm?.[1] ?? lm?.[2] ?? "").trim()),
        note: clean((nm?.[1] ?? nm?.[2] ?? "").trim()),
      };
    })
    .filter((p) => p.label);
}

export function parseSnapshotHtml(html: string): SnapshotChart[] {
  const blocks: { title: string; footnote: string }[] = [];
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll(".chart-block").forEach((b) => {
      blocks.push({
        title: clean(b.querySelector("h1, h2, h3, h4")?.textContent ?? ""),
        footnote: clean(b.querySelector(".footnote")?.textContent ?? ""),
      });
    });
  }

  const xLabel =
    /x\s*:\s*\{[\s\S]{0,400}?text\s*:\s*['"]([^'"]+)['"]/.exec(html)?.[1] ??
    "3-year Revenue CAGR (%)";
  const yLabel =
    /y\s*:\s*\{[\s\S]{0,400}?text\s*:\s*['"]([^'"]+)['"]/.exec(html)?.[1] ??
    "Net Profit Margin (%)";

  const callRe =
    /renderBubbleMatrix\s*\(\s*['"][^'"]*['"]\s*,\s*([A-Za-z0-9_$]+)\s*,([^)]*)\)/g;

  const charts: SnapshotChart[] = [];
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = callRe.exec(html)) !== null) {
    const varName = m[1] ?? "";
    const args = (m[2] ?? "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split(",")
      .map((piece) => piece.trim())
      .filter(Boolean)
      .map(num);
    const block = blocks[i];
    charts.push({
      title: block?.title || `Matrix ${i + 1}`,
      footnote: block?.footnote ?? "",
      xLabel,
      yLabel,
      xDivider: args[0] ?? 0,
      yDivider: args[1] ?? 0,
      xMin: args[2] ?? 0,
      xMax: args[3] ?? 100,
      yMin: args[4] ?? 0,
      yMax: args[5] ?? 100,
      points: parsePointsArray(html, varName),
    });
    i += 1;
  }
  return charts.filter((c) => c.points.length > 0);
}

/* ---------------- data layer (stored in app_settings) ---------------- */

export const industrySnapshotQuery = (industryId: string) =>
  queryOptions({
    queryKey: ["industry-snapshot", industryId],
    queryFn: async (): Promise<IndustrySnapshot | null> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", KEY(industryId))
        .maybeSingle();
      if (error) throw error;
      const value = data ? data.value : null;
      if (!value || typeof value !== "object") return null;
      const snap = normalizeSnapshot(value);
      return snap.charts.length > 0 || snap.dominantModels.length > 0 ? snap : null;
    },
  });

export async function saveIndustrySnapshot(
  industryId: string,
  snapshot: IndustrySnapshot,
): Promise<void> {
  const payload: IndustrySnapshot = { ...snapshot, updated_at: new Date().toISOString() };
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: KEY(industryId), value: payload as never }, { onConflict: "key" });
  if (error) throw error;
}

export async function deleteIndustrySnapshot(industryId: string): Promise<void> {
  const { error } = await supabase.from("app_settings").delete().eq("key", KEY(industryId));
  if (error) throw error;
}
