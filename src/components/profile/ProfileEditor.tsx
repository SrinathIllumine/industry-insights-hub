import { createContext, useContext, useRef, useState } from "react";
import { FileCode, Image as ImageIcon, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { cn } from "@/lib/utils";
import {
  dataUrlToFile,
  isHtmlFile,
  parseHtmlDump,
  parseMarkdownImages,
  stripInlineImageData,
  type ExtractedImage,
} from "@/lib/html-import";
import { matchHtmlImages, materializeProfileImages } from "@/lib/html-image-map";
import { looksLikeResearchReport, parseResearchReport } from "@/lib/research-report-import";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { structureResearchDump } from "@/lib/research-ai.functions";
import { uploadCompanyImage } from "@/lib/research-data";
import type { SettingsMap } from "@/lib/research-data";
import {
  emptyVertical,
  normalizeProfile,
  type CompanyProfile,
  type Grade,
  type IllumineContribution,
  type Vertical,
} from "@/lib/research-types";

const GRADES: Grade[] = ["none", "good", "warn", "bad"];
const GRADE_LABEL: Record<Grade, string> = {
  none: "No grading",
  good: "Green",
  warn: "Orange",
  bad: "Red",
};

type Props = {
  name: string;
  tagline: string;
  profile: CompanyProfile;
  settings: SettingsMap;
  saving: boolean;
  onChange: (next: { name: string; tagline: string; profile: CompanyProfile }) => void;
  onSave: () => void;
  onCancel: () => void;
};

/** Image URLs / data-URIs pulled from an imported HTML dump, so any ImageField
 *  can offer them as a pick-from-document option. */
const ImportedImagesContext = createContext<string[]>([]);

export function ProfileEditor({
  name,
  tagline,
  profile,
  settings,
  saving,
  onChange,
  onSave,
  onCancel,
}: Props) {
  const setProfile = (profileNext: CompanyProfile) =>
    onChange({ name, tagline, profile: profileNext });
  const fin = profile.financials;
  const [importedImages, setImportedImages] = useState<string[]>([]);

  return (
    <ImportedImagesContext.Provider value={importedImages}>
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Company name</Label>
          <Input value={name} onChange={(e) => onChange({ name: e.target.value, tagline, profile })} />
        </div>
        <div className="space-y-1.5">
          <Label>One-liner</Label>
          <Input
            value={tagline}
            onChange={(e) => onChange({ name, tagline: e.target.value, profile })}
          />
        </div>
      </div>

      <Tabs defaultValue="import">
        <TabsList className="flex-wrap">
          <TabsTrigger value="import">Import raw data</TabsTrigger>
          <TabsTrigger value="financials">1. Financials</TabsTrigger>
          <TabsTrigger value="challenges">2. Challenges</TabsTrigger>
          <TabsTrigger value="verticals">3. Verticals</TabsTrigger>
          <TabsTrigger value="initiatives">4. Research</TabsTrigger>
          <TabsTrigger value="partners">5. Partner</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="pt-6">
          <ImportPanel
            companyName={name}
            settings={settings}
            onParsed={(parsed, meta) =>
              onChange({
                name: meta?.name?.trim() || name,
                tagline: meta?.tagline?.trim() || tagline,
                profile: parsed,
              })
            }
            onImagesFound={(srcs) =>
              setImportedImages((prev) => [...prev, ...srcs.filter((s) => !prev.includes(s))])
            }
          />
        </TabsContent>

        <TabsContent value="financials" className="space-y-6 pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Input
                value={fin.unit}
                onChange={(e) =>
                  setProfile({ ...profile, financials: { ...fin, unit: e.target.value } })
                }
              />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <Label>Financial years (comma separated)</Label>
              <Input
                value={fin.years.join(", ")}
                onChange={(e) => {
                  const years = e.target.value
                    .split(",")
                    .map((y) => y.trim())
                    .filter(Boolean);
                  const safeYears = years.length ? years : [""];
                  setProfile({
                    ...profile,
                    financials: {
                      ...fin,
                      years: safeYears,
                      metrics: fin.metrics.map((m) => ({
                        ...m,
                        values: safeYears.map((_, i) => m.values[i] ?? ""),
                        grades: safeYears.map((_, i) => m.grades[i] ?? "none"),
                      })),
                    },
                  });
                }}
              />
            </div>
          </div>

          <div className="space-y-4">
            {fin.metrics.map((metric, mi) => (
              <div key={mi} className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Input
                    className="max-w-xs"
                    value={metric.name}
                    onChange={(e) => {
                      const metrics = [...fin.metrics];
                      metrics[mi] = { ...metric, name: e.target.value };
                      setProfile({ ...profile, financials: { ...fin, metrics } });
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setProfile({
                        ...profile,
                        financials: { ...fin, metrics: fin.metrics.filter((_, i) => i !== mi) },
                      })
                    }
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {fin.years.map((year, yi) => (
                    <div key={yi} className="space-y-1.5">
                      <Label className="text-xs">{year}</Label>
                      <Input
                        value={metric.values[yi] ?? ""}
                        onChange={(e) => {
                          const metrics = [...fin.metrics];
                          const values = [...metric.values];
                          values[yi] = e.target.value;
                          metrics[mi] = { ...metric, values };
                          setProfile({ ...profile, financials: { ...fin, metrics } });
                        }}
                      />
                      <Select
                        value={metric.grades[yi] ?? "none"}
                        onValueChange={(v) => {
                          const metrics = [...fin.metrics];
                          const grades = [...metric.grades];
                          grades[yi] = v as Grade;
                          metrics[mi] = { ...metric, grades };
                          setProfile({ ...profile, financials: { ...fin, metrics } });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GRADES.map((g) => (
                            <SelectItem key={g} value={g}>
                              {GRADE_LABEL[g]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() =>
                setProfile({
                  ...profile,
                  financials: {
                    ...fin,
                    metrics: [
                      ...fin.metrics,
                      {
                        name: "New metric",
                        values: fin.years.map(() => ""),
                        grades: fin.years.map(() => "none" as Grade),
                      },
                    ],
                  },
                })
              }
            >
              <Plus className="size-4" /> Add metric
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Company revenue CAGR (5-year growth rate)"
              value={fin.revenueCagr}
              onChange={(v) => setProfile({ ...profile, financials: { ...fin, revenueCagr: v } })}
            />
            <Field
              label="Industry revenue CAGR (5-year growth rate)"
              value={fin.industryCagr}
              onChange={(v) => setProfile({ ...profile, financials: { ...fin, industryCagr: v } })}
            />
            <div className="space-y-1.5">
              <Label>Overall verdict</Label>
              <Select
                value={fin.verdict || undefined}
                onValueChange={(v) => setProfile({ ...profile, financials: { ...fin, verdict: v } })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a verdict tag" />
                </SelectTrigger>
                <SelectContent>
                  {settings.financial_tags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field
              label="Verdict note"
              value={fin.verdictNote}
              onChange={(v) => setProfile({ ...profile, financials: { ...fin, verdictNote: v } })}
            />
            <Field
              label="Benchmark note"
              value={fin.benchmarkNote}
              onChange={(v) => setProfile({ ...profile, financials: { ...fin, benchmarkNote: v } })}
            />
            <ImageField
              label="Benchmark chart image (where the company stands in the industry)"
              value={fin.benchmarkImageUrl}
              onChange={(v) =>
                setProfile({ ...profile, financials: { ...fin, benchmarkImageUrl: v } })
              }
            />
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
            <div>
              <Label>Narrative charts</Label>
              <p className="text-xs text-muted-foreground">
                Charts that tell the financial story. Each needs a caption explaining what the
                reader should take away.
              </p>
            </div>
            {fin.charts.map((chart, ci) => {
              const updateChart = (patch: Partial<(typeof fin.charts)[number]>) => {
                const charts = [...fin.charts];
                charts[ci] = { ...chart, ...patch };
                setProfile({ ...profile, financials: { ...fin, charts } });
              };
              return (
                <div key={ci} className="space-y-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex justify-end">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setProfile({
                          ...profile,
                          financials: {
                            ...fin,
                            charts: fin.charts.filter((_, x) => x !== ci),
                          },
                        })
                      }
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                  <Field
                    label="Chart title"
                    value={chart.title}
                    onChange={(v) => updateChart({ title: v })}
                  />
                  <TextField
                    label="What story does this chart tell?"
                    value={chart.caption}
                    onChange={(v) => updateChart({ caption: v })}
                  />
                  <ImageField
                    label="Chart image"
                    value={chart.imageUrl}
                    onChange={(v) => updateChart({ imageUrl: v })}
                  />
                </div>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setProfile({
                  ...profile,
                  financials: {
                    ...fin,
                    charts: [...fin.charts, { title: "", imageUrl: "", caption: "" }],
                  },
                })
              }
            >
              <Plus className="size-4" /> Add chart
            </Button>
          </div>

          <TextField
            label="Sense-making narrative (≈2 lines shown at the end of the section)"
            value={fin.narrative}
            onChange={(v) => setProfile({ ...profile, financials: { ...fin, narrative: v } })}
          />
        </TabsContent>

        <TabsContent value="challenges" className="space-y-4 pt-6">
          {profile.challenges.map((challenge, i) => (
            <RowCard
              key={i}
              onRemove={() =>
                setProfile({
                  ...profile,
                  challenges: profile.challenges.filter((_, x) => x !== i),
                })
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Theme / category</Label>
                  <Select
                    value={challenge.theme || undefined}
                    onValueChange={(v) => {
                      const challenges = [...profile.challenges];
                      challenges[i] = { ...challenge, theme: v };
                      setProfile({ ...profile, challenges });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a theme" />
                    </SelectTrigger>
                    <SelectContent>
                      {settings.themes.map((theme) => (
                        <SelectItem key={theme} value={theme}>
                          {theme}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tag</Label>
                  <Select
                    value={challenge.tag || undefined}
                    onValueChange={(v) => {
                      const challenges = [...profile.challenges];
                      challenges[i] = { ...challenge, tag: v };
                      setProfile({ ...profile, challenges });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a tag" />
                    </SelectTrigger>
                    <SelectContent>
                      {settings.challenge_tags.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Detailed problem explanation</Label>
                <p className="text-xs text-muted-foreground">
                  Write it so any reader understands: what the problem is, why it exists, what is
                  at stake, how it is playing out. A few lines are shown by default with a “see
                  more”.
                </p>
                <Textarea
                  rows={7}
                  value={challenge.problem}
                  onChange={(e) => {
                    const challenges = [...profile.challenges];
                    challenges[i] = { ...challenge, problem: e.target.value };
                    setProfile({ ...profile, challenges });
                  }}
                />
              </div>
              <Field
                label="Status right now (one line)"
                value={challenge.status}
                onChange={(v) => {
                  const challenges = [...profile.challenges];
                  challenges[i] = { ...challenge, status: v };
                  setProfile({ ...profile, challenges });
                }}
              />
              <QuotesField
                items={challenge.quotes}
                onChange={(quotes) => {
                  const challenges = [...profile.challenges];
                  challenges[i] = { ...challenge, quotes };
                  setProfile({ ...profile, challenges });
                }}
              />
              <SourcesField
                items={challenge.sources}
                onChange={(sources) => {
                  const challenges = [...profile.challenges];
                  challenges[i] = { ...challenge, sources };
                  setProfile({ ...profile, challenges });
                }}
              />
            </RowCard>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              setProfile({
                ...profile,
                challenges: [
                  ...profile.challenges,
                  { theme: "", problem: "", status: "", quotes: [], tag: "", sources: [] },
                ],
              })
            }
          >
            <Plus className="size-4" /> Add challenge
          </Button>
        </TabsContent>

        <TabsContent value="verticals" className="space-y-4 pt-6">
          <TextField
            label="Framing note (shown above the verticals — how they are defined, what is / isn't a standard BU)"
            value={profile.verticalsNote}
            onChange={(v) => setProfile({ ...profile, verticalsNote: v })}
          />
          <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
            <ImageField
              label="Business verticals overview image (e.g. group revenue split)"
              value={profile.verticalsImageUrl}
              onChange={(v) => setProfile({ ...profile, verticalsImageUrl: v })}
            />
            <Field
              label="Overview image caption"
              value={profile.verticalsImageCaption}
              onChange={(v) => setProfile({ ...profile, verticalsImageCaption: v })}
            />
          </div>
          {profile.verticals.map((v, i) => {
            const update = (patch: Partial<Vertical>) => {
              const verticals = [...profile.verticals];
              verticals[i] = { ...v, ...patch };
              setProfile({ ...profile, verticals });
            };
            return (
              <RowCard
                key={i}
                onRemove={() =>
                  setProfile({ ...profile, verticals: profile.verticals.filter((_, x) => x !== i) })
                }
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Vertical name" value={v.name} onChange={(x) => update({ name: x })} />
                  <Field
                    label="One-liner description"
                    value={v.description}
                    onChange={(x) => update({ description: x })}
                  />
                </div>
                <TextField
                  label="Basic details"
                  value={v.basicDetails}
                  onChange={(x) => update({ basicDetails: x })}
                />

                <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
                  <Label>Revenue</Label>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field
                      label="Headline revenue value"
                      value={v.revenueValue}
                      onChange={(x) => update({ revenueValue: x })}
                    />
                    <Field
                      label="Growth (e.g. +12% YoY)"
                      value={v.revenueGrowth}
                      onChange={(x) => update({ revenueGrowth: x })}
                    />
                    <Field
                      label="Share of group revenue"
                      value={v.shareOfRevenue}
                      onChange={(x) => update({ shareOfRevenue: x })}
                    />
                  </div>
                  <TextField
                    label="Revenue sub-line detail (PAT, units sold, net cash…)"
                    value={v.revenueDetails}
                    onChange={(x) => update({ revenueDetails: x })}
                  />
                  <TextField
                    label="Revenue insight — what really drives this vertical's revenue"
                    value={v.revenueInsight}
                    onChange={(x) => update({ revenueInsight: x })}
                  />
                  <PairListField
                    label="Major revenue contributors"
                    help="Products / services / elements of this vertical that drive revenue."
                    aLabel="Product / service / element"
                    bLabel="Share / value / why it matters"
                    items={v.revenueContributors.map((c) => ({ a: c.name, b: c.detail }))}
                    onChange={(rows) =>
                      update({
                        revenueContributors: rows.map((r) => ({ name: r.a, detail: r.b })),
                      })
                    }
                  />
                  <ImageField
                    label="Product / volume / revenue mix chart (image)"
                    value={v.mixChartUrl}
                    onChange={(x) => update({ mixChartUrl: x })}
                  />
                  <Field
                    label="Mix chart caption"
                    value={v.mixChartCaption}
                    onChange={(x) => update({ mixChartCaption: x })}
                  />
                </div>

                <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
                  <div>
                    <Label>Channel engagement</Label>
                    <p className="text-xs text-muted-foreground">
                      Shown in a popup. Leave anything blank and its card is hidden in the report.
                    </p>
                  </div>
                  <Field
                    label="Channel model name (e.g. Dealer Franchise Model — dominant channel)"
                    value={v.channelModelName}
                    onChange={(x) => update({ channelModelName: x })}
                  />
                  <div className="grid gap-6 md:grid-cols-2">
                    <BulletsField
                      label="Main decision-making stakeholders"
                      help="One per bullet — name — role — what they decide."
                      items={v.stakeholders}
                      onChange={(x) => update({ stakeholders: x })}
                    />
                    <BulletsField
                      label="How the channel engagement works (steps)"
                      help="One step / mechanism per bullet."
                      items={v.engagementModel}
                      onChange={(x) => update({ engagementModel: x })}
                    />
                  </div>
                  <ImageField
                    label="Stakeholder engagement map (image)"
                    value={v.engagementMapUrl}
                    onChange={(x) => update({ engagementMapUrl: x })}
                  />
                  <PairListField
                    label="Dealers, executives & salesforce (numbers card)"
                    help="Dealers, dealer sales executives per dealership, company sales workforce, retail outlets…"
                    aLabel="Label"
                    bLabel="Number (incl. est./confirmed)"
                    items={v.channelStats.map((s) => ({ a: s.label, b: s.value }))}
                    onChange={(rows) =>
                      update({ channelStats: rows.map((r) => ({ label: r.a, value: r.b })) })
                    }
                  />
                  <TextField
                    label="Methodology note (how estimated numbers were derived)"
                    value={v.channelMethodology}
                    onChange={(x) => update({ channelMethodology: x })}
                  />
                  <BulletsField
                    label="Types of dealers & channels"
                    items={v.dealerChannelTypes}
                    onChange={(x) => update({ dealerChannelTypes: x })}
                  />
                </div>

                <ContributionsField
                  models={settings.illumine_models}
                  items={v.contributions}
                  onChange={(x) => update({ contributions: x })}
                />
              </RowCard>
            );
          })}
          <Button
            variant="outline"
            onClick={() =>
              setProfile({
                ...profile,
                verticals: [...profile.verticals, emptyVertical()],
              })
            }
          >
            <Plus className="size-4" /> Add vertical
          </Button>
        </TabsContent>

        <TabsContent value="initiatives" className="space-y-4 pt-6">
          {profile.initiatives.map((row, i) => {
            const update = (patch: Partial<typeof row>) => {
              const initiatives = [...profile.initiatives];
              initiatives[i] = { ...row, ...patch };
              setProfile({ ...profile, initiatives });
            };
            return (
              <RowCard
                key={i}
                onRemove={() =>
                  setProfile({
                    ...profile,
                    initiatives: profile.initiatives.filter((_, x) => x !== i),
                  })
                }
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Area</Label>
                    <Select value={row.area || undefined} onValueChange={(v) => update({ area: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an area" />
                      </SelectTrigger>
                      <SelectContent>
                        {settings.initiative_areas.map((area) => (
                          <SelectItem key={area} value={area}>
                            {area}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Field label="Category" value={row.category} onChange={(v) => update({ category: v })} />
                  <Field
                    label="Initiative"
                    value={row.initiative}
                    onChange={(v) => update({ initiative: v })}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField
                    label="What it does"
                    value={row.whatItDoes}
                    onChange={(v) => update({ whatItDoes: v })}
                  />
                  <TextField
                    label="How it is done"
                    value={row.howItIsDone}
                    onChange={(v) => update({ howItIsDone: v })}
                  />
                </div>
              </RowCard>
            );
          })}
          <Button
            variant="outline"
            onClick={() =>
              setProfile({
                ...profile,
                initiatives: [
                  ...profile.initiatives,
                  { area: "", category: "", initiative: "", whatItDoes: "", howItIsDone: "" },
                ],
              })
            }
          >
            <Plus className="size-4" /> Add initiative
          </Button>
        </TabsContent>

        <TabsContent value="partners" className="space-y-4 pt-6">
          {profile.partnerContributions.map((row, i) => {
            const update = (patch: Partial<typeof row>) => {
              const partnerContributions = [...profile.partnerContributions];
              partnerContributions[i] = { ...row, ...patch };
              setProfile({ ...profile, partnerContributions });
            };
            return (
              <RowCard
                key={i}
                onRemove={() =>
                  setProfile({
                    ...profile,
                    partnerContributions: profile.partnerContributions.filter((_, x) => x !== i),
                  })
                }
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Date" value={row.date} onChange={(v) => update({ date: v })} />
                  <div className="space-y-1.5">
                    <Label>Stage</Label>
                    <Select value={row.stage || undefined} onValueChange={(v) => update({ stage: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {settings.engagement_stages.map((stage) => (
                          <SelectItem key={stage} value={stage}>
                            {stage}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Field label="Title" value={row.title} onChange={(v) => update({ title: v })} />
                </div>
                <TextField
                  label="Description"
                  value={row.description}
                  onChange={(v) => update({ description: v })}
                />
              </RowCard>
            );
          })}
          <Button
            variant="outline"
            onClick={() =>
              setProfile({
                ...profile,
                partnerContributions: [
                  ...profile.partnerContributions,
                  { date: "", stage: "", title: "", description: "" },
                ],
              })
            }
          >
            <Plus className="size-4" /> Add engagement
          </Button>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-4 flex justify-end gap-3 rounded-xl border border-border bg-card/90 p-4 backdrop-blur">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Save profile
        </Button>
      </div>
    </div>
    </ImportedImagesContext.Provider>
  );
}

function ImportPanel({
  companyName,
  settings,
  onParsed,
  onImagesFound,
}: {
  companyName: string;
  settings: SettingsMap;
  onParsed: (profile: CompanyProfile, meta?: { name?: string; tagline?: string }) => void;
  onImagesFound?: (srcs: string[]) => void;
}) {
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [parsedImages, setParsedImages] = useState<ExtractedImage[]>([]);
  const [htmlSource, setHtmlSource] = useState("");
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const structure = useServerFn(structureResearchDump);

  const uploadInline = (dataUrl: string) =>
    uploadCompanyImage(dataUrlToFile(dataUrl, "from-report"));

  const registerImages = (images: ExtractedImage[]) => {
    if (!images.length) return;
    setParsedImages((prev) => {
      const seen = new Set(prev.map((im) => im.src));
      return [...prev, ...images.filter((im) => !seen.has(im.src))];
    });
    onImagesFound?.(images.map((im) => im.src));
  };

  const readFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const texts: string[] = [];
    const collected: ExtractedImage[] = [];
    let sawHtml = false;

    for (const file of Array.from(files)) {
      const content = await file.text();
      if (isHtmlFile(file)) {
        sawHtml = true;
        setHtmlSource(content);
        const { text, images } = parseHtmlDump(content);
        texts.push(`--- ${file.name} (HTML → text) ---\n${text}`);
        collected.push(...images);
      } else {
        texts.push(`--- ${file.name} ---\n${stripInlineImageData(content)}`);
        collected.push(...parseMarkdownImages(content));
      }
    }

    setRaw((prev) => [prev, ...texts].filter(Boolean).join("\n\n"));
    registerImages(collected);
    if (collected.length) {
      toast.success(
        `${collected.length} image${collected.length > 1 ? "s" : ""} found — they will be placed automatically when you structure the data`,
      );
    } else if (sawHtml) {
      toast.info(
        "No embeddable images found in the HTML — images with relative paths can't be pulled in.",
      );
    }
  };

  /** Upload inline images, then hand the finished profile back and clear the bar. */
  const finish = async (
    draft: CompanyProfile,
    meta: { name?: string; tagline?: string } | undefined,
    doneMessage: string,
    base = 55,
  ) => {
    setPhase("Placing charts, graphs & maps…");
    let profile = normalizeProfile(draft);
    profile = await materializeProfileImages(profile, uploadInline, (done, total) =>
      setProgress(base + Math.round((done / Math.max(total, 1)) * (98 - base))),
    );
    profile = normalizeProfile(profile);
    setPhase("Building the profile…");
    setProgress(100);
    onParsed(profile, meta);
    toast.success(doneMessage);
    window.setTimeout(() => {
      setProgress(0);
      setPhase("");
    }, 600);
  };

  const run = async () => {
    if (!raw.trim() && !htmlSource) {
      toast.error("Paste or drop some research data first");
      return;
    }

    const pastedHtml = /^\s*(<!doctype html|<html[\s>]|<body[\s>])/i.test(raw) ? raw : "";
    const reportHtml = htmlSource || pastedHtml;

    // 1) Free path: a "Company Research Report" HTML template parses locally.
    if (reportHtml) {
      const report = parseResearchReport(reportHtml);
      if (report) {
        setBusy(true);
        setPhase("Reading the research report…");
        setProgress(30);
        try {
          await finish(
            report.profile,
            { name: report.name, tagline: report.tagline },
            "Imported the research report — no AI credits used",
          );
        } catch (error) {
          setProgress(0);
          setPhase("");
          toast.error((error as Error).message);
        } finally {
          setBusy(false);
        }
        return;
      }
    }

    // 2) Fall back to the AI for freeform dumps.
    let payload = raw;
    let images = parsedImages;
    const merge = (found: ExtractedImage[]) => {
      if (!found.length) return;
      registerImages(found);
      const seen = new Set(images.map((im) => im.src));
      images = [...images, ...found.filter((im) => !seen.has(im.src))];
    };
    if (pastedHtml) {
      const parsed = parseHtmlDump(raw);
      payload = parsed.text;
      merge(parsed.images);
    } else {
      payload = stripInlineImageData(raw);
      merge(parseMarkdownImages(raw));
    }

    setBusy(true);
    setPhase("Structuring with AI…");
    setProgress(6);
    // Ease progress toward ~80% while we wait on the model (unknown duration).
    let p = 6;
    const tick = window.setInterval(() => {
      p = p + (80 - p) * 0.05;
      setProgress(Math.round(p));
    }, 500);

    try {
      const result = await structure({
        data: {
          raw: payload,
          companyName,
          themes: settings.themes,
          challengeTags: settings.challenge_tags,
          financialTags: settings.financial_tags,
          illumineModels: settings.illumine_models,
        },
      });
      window.clearInterval(tick);
      if (!result.ok) {
        setProgress(0);
        setPhase("");
        toast.error(result.error);
        return;
      }
      setProgress(82);
      const structured = images.length
        ? matchHtmlImages(normalizeProfile(result.profile), images)
        : normalizeProfile(result.profile);
      await finish(structured, undefined, "Data structured — review the blocks and save", 82);
    } catch (error) {
      window.clearInterval(tick);
      setProgress(0);
      setPhase("");
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void readFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`grid cursor-pointer place-items-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragging ? "border-primary bg-muted" : "border-border"
        }`}
      >
        <Upload className="mb-3 size-6 text-muted-foreground" />
        <p className="text-sm font-medium">Drop a research report (HTML), or a markdown / text dump</p>
        <p className="text-xs text-muted-foreground">
          A “Company Research Report” HTML file is parsed here directly — no AI, no credits — with
          all its charts and maps. Other dumps use AI to structure them.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".md,.markdown,.txt,.csv,.json,.html,.htm,.xhtml"
          className="hidden"
          onChange={(e) => void readFiles(e.target.files)}
        />
      </div>
      {looksLikeResearchReport(htmlSource || raw) ? (
        <p className="flex items-center gap-2 rounded-lg bg-good-soft px-3 py-2 text-xs font-semibold text-good-foreground">
          <FileCode className="size-4" />
          Research report detected — “Structure into blocks” will parse it locally, no AI credits
          used.
        </p>
      ) : parsedImages.length > 0 ? (
        <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <FileCode className="size-4" />
          {parsedImages.length} image{parsedImages.length > 1 ? "s" : ""} ready — “Structure into
          blocks” places them; you can also pick them in any image field.
        </p>
      ) : null}

      <Textarea
        rows={12}
        placeholder="…or paste the raw research dump (or a full HTML report) here"
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          setHtmlSource("");
        }}
      />

      {busy || progress > 0 ? (
        <div className="space-y-1.5 rounded-xl border border-border bg-muted/40 p-4">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>{phase || "Working…"}</span>
            <span>{Math.min(progress, 100)}%</span>
          </div>
          <Progress value={Math.min(progress, 100)} />
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Structuring replaces the current draft blocks. You can still edit everything before saving.
        </p>
        <Button onClick={run} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Structure into blocks
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const importedImages = useContext(ImportedImagesContext);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadCompanyImage(file);
      onChange(url);
      toast.success("Image uploaded");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const pickImported = async (src: string) => {
    setPickOpen(false);
    if (!src.startsWith("data:")) {
      onChange(src);
      return;
    }
    setBusy(true);
    try {
      const url = await uploadCompanyImage(dataUrlToFile(src, "from-html"));
      onChange(url);
      toast.success("Image attached");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 md:col-span-2">
      <Label>{label}</Label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "grid min-h-[9rem] cursor-pointer place-items-center rounded-xl border-2 border-dashed bg-muted/40 p-4 text-center transition-colors",
          dragging ? "border-primary bg-muted" : "border-border",
        )}
      >
        {busy ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : value ? (
          <img
            src={value}
            alt="Benchmark chart preview"
            className="max-h-56 w-full object-contain"
          />
        ) : (
          <div className="space-y-1">
            <ImageIcon className="mx-auto size-6 text-muted-foreground" />
            <p className="text-sm font-medium">Drop an image here or click to upload</p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, SVG, GIF — up to 10 MB. Or paste an image URL below.
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="https://… image URL"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value ? (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onChange("")}
            aria-label="Remove image"
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        ) : null}
      </div>

      {importedImages.length > 0 ? (
        <Button variant="outline" size="sm" onClick={() => setPickOpen(true)}>
          <ImageIcon className="size-4" /> From imported HTML ({importedImages.length})
        </Button>
      ) : null}

      <Dialog open={pickOpen} onOpenChange={setPickOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Pick an image from the imported HTML</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[65vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
            {importedImages.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => void pickImported(src)}
                className="group overflow-hidden rounded-lg border border-border bg-card p-2 transition-colors hover:border-primary"
              >
                <img
                  src={src}
                  alt={`Imported image ${i + 1}`}
                  className="h-28 w-full object-contain"
                />
                <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                  {src.startsWith("data:") ? "embedded image" : src}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type QuoteRow = { text: string; by: string; sourceLabel: string; sourceUrl: string };

function QuotesField({
  items,
  onChange,
}: {
  items: QuoteRow[];
  onChange: (next: QuoteRow[]) => void;
}) {
  const patch = (i: number, p: Partial<QuoteRow>) => {
    const next = [...items];
    const current = next[i];
    if (!current) return;
    next[i] = { ...current, ...p };
    onChange(next);
  };
  return (
    <div className="space-y-2">
      <Label>Stakeholder quotes</Label>
      <p className="text-xs text-muted-foreground">
        Verbatim, each genuinely about this problem. Add its own source link where known — never
        force-fit a quote.
      </p>
      {items.map((q, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border bg-card p-3">
          <div className="flex justify-end">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onChange(items.filter((_, x) => x !== i))}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
          <Textarea
            rows={3}
            placeholder="“…verbatim quote…”"
            value={q.text}
            onChange={(e) => patch(i, { text: e.target.value })}
          />
          <div className="grid gap-2 md:grid-cols-3">
            <Input
              placeholder="Said by (name, role)"
              value={q.by}
              onChange={(e) => patch(i, { by: e.target.value })}
            />
            <Input
              placeholder="Source name"
              value={q.sourceLabel}
              onChange={(e) => patch(i, { sourceLabel: e.target.value })}
            />
            <Input
              placeholder="https://… source"
              value={q.sourceUrl}
              onChange={(e) => patch(i, { sourceUrl: e.target.value })}
            />
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, { text: "", by: "", sourceLabel: "", sourceUrl: "" }])}
      >
        <Plus className="size-4" /> Add quote
      </Button>
    </div>
  );
}

function SourcesField({
  items,
  onChange,
}: {
  items: { label: string; url: string }[];
  onChange: (next: { label: string; url: string }[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Reference sources</Label>
      <p className="text-xs text-muted-foreground">
        Where the problem / quote was pulled from — a publication name and its URL.
      </p>
      {items.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            className="max-w-[14rem]"
            placeholder="Source name"
            value={s.label}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...s, label: e.target.value };
              onChange(next);
            }}
          />
          <Input
            placeholder="https://…"
            value={s.url}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...s, url: e.target.value };
              onChange(next);
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onChange(items.filter((_, x) => x !== i))}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, { label: "", url: "" }])}
      >
        <Plus className="size-4" /> Add source
      </Button>
    </div>
  );
}

function PairListField({
  label,
  help,
  aLabel,
  bLabel,
  items,
  onChange,
}: {
  label: string;
  help?: string;
  aLabel: string;
  bLabel: string;
  items: { a: string; b: string }[];
  onChange: (next: { a: string; b: string }[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
      {items.map((row, i) => (
        <div key={i} className="flex items-start gap-2">
          <Input
            placeholder={aLabel}
            value={row.a}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...row, a: e.target.value };
              onChange(next);
            }}
          />
          <Input
            placeholder={bLabel}
            value={row.b}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...row, b: e.target.value };
              onChange(next);
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onChange(items.filter((_, x) => x !== i))}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, { a: "", b: "" }])}
      >
        <Plus className="size-4" /> Add row
      </Button>
    </div>
  );
}

function BulletsField({
  label,
  help,
  items,
  onChange,
}: {
  label: string;
  help?: string;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-3 size-1.5 shrink-0 rounded-full bg-primary" />
            <Textarea
              rows={2}
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onChange(items.filter((_, x) => x !== i))}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No bullets yet.</p>
        ) : null}
      </div>
      <Button variant="outline" size="sm" onClick={() => onChange([...items, ""])}>
        <Plus className="size-4" /> Add bullet
      </Button>
    </div>
  );
}

function ContributionsField({
  models,
  items,
  onChange,
}: {
  models: string[];
  items: IllumineContribution[];
  onChange: (next: IllumineContribution[]) => void;
}) {
  const [custom, setCustom] = useState("");
  const selected = new Set(items.map((c) => c.model));

  const toggle = (model: string) => {
    if (selected.has(model)) {
      onChange(items.filter((c) => c.model !== model));
    } else {
      onChange([...items, { model, configuration: "" }]);
    }
  };

  const addCustom = () => {
    const name = custom.trim();
    if (!name) return;
    if (selected.has(name)) {
      toast.error("That model is already added");
      return;
    }
    onChange([...items, { model: name, configuration: "" }]);
    setCustom("");
  };

  const setConfig = (model: string, configuration: string) => {
    onChange(items.map((c) => (c.model === model ? { ...c, configuration } : c)));
  };

  const extraSelected = items.filter((c) => c.model && !models.includes(c.model));

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
      <div>
        <Label>Illumine's potential contributions</Label>
        <p className="text-xs text-muted-foreground">
          Select the models / solutions that could serve this vertical. New models can also be
          added — and maintained centrally under Settings.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {models.map((model) => (
          <label
            key={model}
            className="flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-card p-3 text-sm"
          >
            <Checkbox
              className="mt-0.5"
              checked={selected.has(model)}
              onCheckedChange={() => toggle(model)}
            />
            <span>{model}</span>
          </label>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Add a new model / solution"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <Button variant="outline" onClick={addCustom}>
          <Plus className="size-4" /> Add
        </Button>
      </div>

      {extraSelected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {extraSelected.map((c) => (
            <span
              key={c.model}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
            >
              {c.model}
              <button
                type="button"
                onClick={() => onChange(items.filter((x) => x.model !== c.model))}
                aria-label={`Remove ${c.model}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="space-y-4 border-t border-border pt-4">
          {items.map((c, ci) => (
            <div key={c.model || ci} className="space-y-1.5">
              <Label className="text-sm font-semibold">
                {c.model || "Model (unnamed)"} — How do you think it can be configured for the
                company?
              </Label>
              <Textarea
                rows={3}
                value={c.configuration}
                onChange={(e) => setConfig(c.model, e.target.value)}
                placeholder="Describe how this model would be adapted / configured for this company and vertical…"
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RowCard({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      <div className="flex justify-end">
        <Button size="icon" variant="ghost" onClick={onRemove}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
      {children}
    </div>
  );
}
