import { useRef, useState } from "react";
import { Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

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
import { structureResearchDump } from "@/lib/research-ai.functions";
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

  return (
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
            onParsed={(parsed) => setProfile(parsed)}
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
              label="Revenue CAGR"
              value={fin.revenueCagr}
              onChange={(v) => setProfile({ ...profile, financials: { ...fin, revenueCagr: v } })}
            />
            <Field
              label="Industry CAGR"
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
              label="Benchmark chart image URL"
              value={fin.benchmarkImageUrl}
              onChange={(v) =>
                setProfile({ ...profile, financials: { ...fin, benchmarkImageUrl: v } })
              }
            />
            <Field
              label="Benchmark note"
              value={fin.benchmarkNote}
              onChange={(v) => setProfile({ ...profile, financials: { ...fin, benchmarkNote: v } })}
            />
          </div>
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
              <TextField
                label="Actual problem"
                value={challenge.problem}
                onChange={(v) => {
                  const challenges = [...profile.challenges];
                  challenges[i] = { ...challenge, problem: v };
                  setProfile({ ...profile, challenges });
                }}
              />
              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <TextField
                    label="Quote from stakeholders"
                    value={challenge.quote}
                    onChange={(v) => {
                      const challenges = [...profile.challenges];
                      challenges[i] = { ...challenge, quote: v };
                      setProfile({ ...profile, challenges });
                    }}
                  />
                </div>
                <Field
                  label="Said by"
                  value={challenge.quoteBy}
                  onChange={(v) => {
                    const challenges = [...profile.challenges];
                    challenges[i] = { ...challenge, quoteBy: v };
                    setProfile({ ...profile, challenges });
                  }}
                />
              </div>
            </RowCard>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              setProfile({
                ...profile,
                challenges: [
                  ...profile.challenges,
                  { theme: "", problem: "", quote: "", quoteBy: "", tag: "" },
                ],
              })
            }
          >
            <Plus className="size-4" /> Add challenge
          </Button>
        </TabsContent>

        <TabsContent value="verticals" className="space-y-4 pt-6">
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
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField
                    label="Basic details"
                    value={v.basicDetails}
                    onChange={(x) => update({ basicDetails: x })}
                  />
                  <TextField
                    label="Revenue details"
                    value={v.revenueDetails}
                    onChange={(x) => update({ revenueDetails: x })}
                  />
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <BulletsField
                    label="Stakeholders"
                    help="One stakeholder or group per bullet — include role, context and any numbers."
                    items={v.stakeholders}
                    onChange={(x) => update({ stakeholders: x })}
                  />
                  <BulletsField
                    label="Channel engagement model"
                    help="One step / channel per bullet. Keep figures readable, e.g. “~12,000 retailers across 4 zones”."
                    items={v.engagementModel}
                    onChange={(x) => update({ engagementModel: x })}
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
  );
}

function ImportPanel({
  companyName,
  settings,
  onParsed,
}: {
  companyName: string;
  settings: SettingsMap;
  onParsed: (profile: CompanyProfile) => void;
}) {
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const structure = useServerFn(structureResearchDump);

  const readFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const texts: string[] = [];
    for (const file of Array.from(files)) {
      texts.push(`--- ${file.name} ---\n${await file.text()}`);
    }
    setRaw((prev) => [prev, ...texts].filter(Boolean).join("\n\n"));
  };

  const run = async () => {
    if (!raw.trim()) {
      toast.error("Paste or drop some research data first");
      return;
    }
    setBusy(true);
    try {
      const result = await structure({
        data: {
          raw,
          companyName,
          themes: settings.themes,
          challengeTags: settings.challenge_tags,
          financialTags: settings.financial_tags,
          illumineModels: settings.illumine_models,
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onParsed(normalizeProfile(result.profile));
      toast.success("Data structured — review the blocks and save");
    } catch (error) {
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
        <p className="text-sm font-medium">Drop markdown, text or CSV dumps here</p>
        <p className="text-xs text-muted-foreground">
          Anything works — Claude MD exports, meeting notes, pasted tables.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".md,.markdown,.txt,.csv,.json"
          className="hidden"
          onChange={(e) => void readFiles(e.target.files)}
        />
      </div>

      <Textarea
        rows={12}
        placeholder="…or paste the raw research dump here"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
      />

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
