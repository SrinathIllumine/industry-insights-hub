import { useState, type ReactNode } from "react";
import { ChevronDown, ExternalLink, Linkedin, Maximize2, Table2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type {
  Challenge,
  CompanyProfile,
  FinancialChart,
  Grade,
  Partner,
  Quote,
  Stakeholder,
  Vertical,
} from "@/lib/research-types";

const CONTEXT_LABEL_COLORS = [
  "bg-good-soft text-good-foreground",
  "bg-warn-soft text-warn-foreground",
  "bg-bad-soft text-bad-foreground",
  "bg-primary text-primary-foreground",
];

const gradeClass: Record<Grade, string> = {
  good: "bg-good-soft text-good-foreground font-semibold",
  warn: "bg-warn-soft text-warn-foreground font-semibold",
  bad: "bg-bad-soft text-bad-foreground font-semibold",
  none: "text-foreground",
};

/* ---------- shared bits ---------- */

function CollapsibleCard({
  index,
  title,
  defaultOpen = false,
  children,
}: {
  index: string;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-colors hover:bg-muted/50"
      >
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
          <span className="size-2 rounded-full bg-primary" />
          {index}. {title}
        </h3>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? <div className="border-t border-border px-6 pb-8 pt-6">{children}</div> : null}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm leading-relaxed text-foreground">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
          <span className="whitespace-pre-line">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SubCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4">
      <p className="label-caps mb-3">{title}</p>
      {children}
    </div>
  );
}

function Callout({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border-l-4 border-primary bg-muted/50 p-4">
      <span className="label-caps">{label}</span>
      <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-foreground">{text}</p>
    </div>
  );
}

/** Renders text with `**bold**` segments as <strong> (inherits colour). */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\*\*[^*]+\*\*$/.test(p) ? (
          <strong key={i} className="font-bold">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function Avatar({ src, name, size = "size-12" }: { src: string; name: string; size?: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
  return src ? (
    <img
      src={src}
      alt={name}
      className={cn("shrink-0 rounded-full border border-border object-cover", size)}
    />
  ) : (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full border border-border bg-muted text-xs font-bold text-muted-foreground",
        size,
      )}
    >
      {initials || "—"}
    </span>
  );
}

/** Image thumbnail + caption that opens a zoom dialog. Renders nothing without an image. */
function ImageFigure({
  src,
  title,
  caption,
  className,
}: {
  src: string;
  title?: string;
  caption?: string;
  className?: string;
}) {
  const [zoom, setZoom] = useState(false);
  if (!src) return null;
  return (
    <>
      <figure className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
        <button
          type="button"
          onClick={() => setZoom(true)}
          className="block w-full cursor-zoom-in bg-card"
        >
          <img src={src} alt={title || "Chart"} className="max-h-72 w-full object-contain p-3" />
        </button>
        {title || caption ? (
          <figcaption className="space-y-1 border-t border-border p-4">
            {title ? (
              <p className="font-display text-sm font-bold text-foreground">{title}</p>
            ) : null}
            {caption ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{caption}</p>
            ) : null}
          </figcaption>
        ) : null}
      </figure>

      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{title || "Chart"}</DialogTitle>
          </DialogHeader>
          <img
            src={src}
            alt={title || "Chart"}
            className="max-h-[72vh] w-full rounded-xl border border-border bg-card object-contain p-2"
          />
          {caption ? <p className="text-sm text-muted-foreground">{caption}</p> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ExpandableText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState(false);
  const isLong = text.length > 320 || text.split(/\r?\n/).length > 4;

  return (
    <div>
      <p
        className={cn(
          "whitespace-pre-line text-[15px] leading-relaxed text-foreground",
          !open && isLong && "line-clamp-4",
        )}
      >
        {text}
      </p>
      {isLong ? (
        <div className="mt-2 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs font-bold uppercase tracking-wide text-primary hover:underline"
          >
            {open ? "See less" : "See more…"}
          </button>
          <button
            type="button"
            onClick={() => setDialog(true)}
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            <Maximize2 className="size-3" /> Full view
          </button>
        </div>
      ) : null}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Full explanation</DialogTitle>
          </DialogHeader>
          <p className="max-h-[70vh] overflow-y-auto whitespace-pre-line text-[15px] leading-relaxed text-foreground">
            {text}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SourceChip({ label, url }: { label: string; url: string }) {
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground hover:border-primary"
      >
        <ExternalLink className="size-3" />
        {label}
      </a>
    );
  }
  return (
    <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
      {label}
    </span>
  );
}

function Sources({ sources }: { sources: Challenge["sources"] }) {
  if (!sources.length) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="label-caps">Sources</span>
      {sources.map((s, i) => (
        <SourceChip key={i} label={s.label} url={s.url} />
      ))}
    </div>
  );
}

function QuoteBlock({ q }: { q: Quote }) {
  return (
    <blockquote className="mt-4 border-l-2 border-border pl-4 text-muted-foreground">
      <p className="italic">“{q.text}”</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        {q.by ? (
          <cite className="text-xs font-bold uppercase not-italic text-muted-foreground">
            — {q.by}
          </cite>
        ) : null}
        {q.sourceUrl || q.sourceLabel ? (
          <SourceChip label={q.sourceLabel || "source"} url={q.sourceUrl} />
        ) : null}
      </div>
    </blockquote>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <span className="label-caps">{label}</span>
      <p className="mt-0.5 whitespace-pre-line text-sm text-foreground">{value}</p>
    </div>
  );
}

/* ---------- main view ---------- */

type VerticalPopup = {
  v: Vertical;
  kind: "stakeholders" | "engagementModel" | "contributions";
};

const POPUP_TITLE: Record<VerticalPopup["kind"], string> = {
  stakeholders: "Decision-making stakeholders",
  engagementModel: "Channel engagement model",
  contributions: "Illumine's potential contributions",
};

export function ProfileView({
  profile,
  partners = [],
}: {
  profile: CompanyProfile;
  partners?: Partner[];
}) {
  const [tableOpen, setTableOpen] = useState(false);
  const [popup, setPopup] = useState<VerticalPopup | null>(null);
  const fin = profile.financials;

  const charts: FinancialChart[] = [
    ...fin.charts.filter((c) => c.imageUrl),
    ...(fin.benchmarkImageUrl
      ? [
          {
            title: "Where the company stands in the industry",
            imageUrl: fin.benchmarkImageUrl,
            caption: fin.benchmarkNote,
          },
        ]
      : []),
  ];
  const hasTable = fin.metrics.some((m) => m.values.some(Boolean));
  const soleChart = charts.length === 1 ? charts[0] : undefined;

  const mappedPartners = partners.filter((p) => profile.associatedPartnerIds.includes(p.id));

  return (
    <div className="space-y-4">
      {/* Block I — Financials */}
      <CollapsibleCard index="I" title="Financial Performance" defaultOpen>
        {soleChart ? (
          <div className="mx-auto max-w-2xl">
            <ImageFigure
              src={soleChart.imageUrl}
              title={soleChart.title}
              caption={soleChart.caption}
            />
          </div>
        ) : charts.length > 1 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {charts.map((chart, i) => (
              <ImageFigure
                key={i}
                src={chart.imageUrl}
                title={chart.title}
                caption={chart.caption}
              />
            ))}
          </div>
        ) : null}

        <div className={cn("grid gap-3 sm:grid-cols-2", charts.length > 0 && "mt-6")}>
          <div className="rounded-xl bg-muted px-4 py-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Company revenue CAGR
            </span>
            <p className="mt-0.5 font-display text-lg font-bold text-foreground">
              {fin.revenueCagr || "—"}
              <span className="ml-1 text-[10px] font-medium text-muted-foreground">5-yr</span>
            </p>
          </div>
          <div className="rounded-xl bg-muted px-4 py-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Industry revenue CAGR
            </span>
            <p className="mt-0.5 font-display text-lg font-bold text-foreground">
              {fin.industryCagr || "—"}
              <span className="ml-1 text-[10px] font-medium text-muted-foreground">5-yr</span>
            </p>
          </div>
        </div>

        {hasTable ? (
          <div className="mt-6">
            <Button variant="outline" onClick={() => setTableOpen(true)}>
              <Table2 className="size-4" /> View financial data table
            </Button>
          </div>
        ) : null}

        {fin.insights.length > 0 ? (
          <div className="mt-8 rounded-lg border border-border bg-card p-5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              What this means for the business
            </span>
            <ul className="mt-3 space-y-2.5">
              {fin.insights.map((line, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-foreground">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>
                    <RichText text={line} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : fin.narrative ? (
          <div className="mt-8">
            <Callout label="Insight" text={fin.narrative} />
          </div>
        ) : null}
      </CollapsibleCard>

      {/* Block II — Challenges / Aspirations */}
      <CollapsibleCard index="II" title="Overall Business Challenge / Aspiration">
        {profile.challenges.length === 0 ? (
          <Empty text="No challenges or aspirations captured yet." />
        ) : (
          <div className="space-y-6">
            {profile.challenges.map((challenge, i) => {
              const kind = challenge.mood === "aspiration" ? "Aspiration" : "Challenge";
              return (
                <div key={i} className="rounded-2xl border border-border bg-muted/40 p-6">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                          challenge.mood === "aspiration"
                            ? "bg-good-soft text-good-foreground"
                            : "bg-warn-soft text-warn-foreground",
                        )}
                      >
                        {kind}
                      </span>
                      <h4 className="mt-2 font-display text-lg font-bold text-foreground">
                        {challenge.theme || "Unassigned theme"}
                      </h4>
                    </div>
                    {challenge.tag ? (
                      <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase text-primary-foreground">
                        {challenge.tag}
                      </span>
                    ) : null}
                  </div>

                  {challenge.summary ? (
                    <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground">
                      {challenge.summary}
                    </p>
                  ) : null}

                  {challenge.contexts.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">—</p>
                  ) : (
                    <div
                      className={cn(
                        "space-y-5",
                        challenge.contexts.length > 1 || challenge.summary ? "mt-5" : "",
                      )}
                    >
                      {challenge.contexts.map((ctx, ci) => (
                        <div
                          key={ci}
                          className={cn(
                            challenge.contexts.length > 1 &&
                              "rounded-xl border-l-2 border-primary bg-card p-4",
                          )}
                        >
                          {ctx.label ? (
                            <span
                              className={cn(
                                "inline-block rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide",
                                CONTEXT_LABEL_COLORS[ci % CONTEXT_LABEL_COLORS.length],
                              )}
                            >
                              {ctx.label}
                            </span>
                          ) : null}
                          {ctx.title ? (
                            <p className="mb-2 mt-1.5 text-[15px] font-semibold text-foreground">
                              {ctx.title}
                            </p>
                          ) : null}
                          {ctx.problem ? (
                            <ExpandableText text={ctx.problem} />
                          ) : (
                            <p className="text-sm text-muted-foreground">—</p>
                          )}
                          {ctx.status ? (
                            <p className="mt-3 rounded-lg bg-muted/60 px-4 py-2 text-sm font-medium text-foreground">
                              <span className="label-caps mr-2">Status</span>
                              {ctx.status}
                            </p>
                          ) : null}
                          {ctx.quotes.map((q, qi) => (
                            <QuoteBlock key={qi} q={q} />
                          ))}
                          <Sources sources={ctx.sources} />
                        </div>
                      ))}
                    </div>
                  )}

                  <Sources sources={challenge.sources} />
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleCard>

      {/* Block III — Verticals */}
      <CollapsibleCard index="III" title="Business Verticals">
        {profile.verticalsNote ? (
          <div className="mb-6">
            <Callout label="How these verticals are defined" text={profile.verticalsNote} />
          </div>
        ) : null}
        {profile.verticalsImageUrl ? (
          <div className="mb-6">
            <ImageFigure
              src={profile.verticalsImageUrl}
              title="Business verticals overview"
              caption={profile.verticalsImageCaption}
              className="mx-auto max-w-2xl"
            />
          </div>
        ) : null}
        {profile.verticals.length === 0 ? (
          <Empty text="No business verticals captured yet." />
        ) : (
          <div className="flex gap-10 overflow-x-auto pb-4">
            {profile.verticals.map((v, i) => (
              <VerticalColumn key={i} v={v} onOpen={(kind) => setPopup({ v, kind })} />
            ))}
          </div>
        )}
      </CollapsibleCard>

      {/* Block IV — Initiatives */}
      <CollapsibleCard index="IV" title="Company-level Research">
        {profile.initiatives.length === 0 ? (
          <Empty text="No initiatives captured yet." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  {["Area", "Category", "Initiative", "Year", "What it does", "How it is done"].map(
                    (h) => (
                      <th key={h} className="p-4 text-left font-semibold text-muted-foreground">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {profile.initiatives.map((row, i) => (
                  <tr key={i} className="border-t border-border align-top">
                    <td className="p-4 font-medium">{row.area}</td>
                    <td className="p-4">
                      {row.category ? (
                        <span
                          className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
                          style={{ backgroundColor: categoryColor(row.category) }}
                        >
                          {row.category}
                        </span>
                      ) : null}
                    </td>
                    <td className="p-4 font-medium">{row.initiative}</td>
                    <td className="whitespace-nowrap p-4 font-medium">{row.year || "—"}</td>
                    <td className="p-4 text-muted-foreground">{row.whatItDoes}</td>
                    <td className="p-4 text-muted-foreground">{row.howItIsDone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleCard>

      {/* Block V — Associated partner */}
      <CollapsibleCard index="V" title="Associated Partner">
        {mappedPartners.length === 0 && profile.partnerContributions.length === 0 ? (
          <Empty text="No partner mapped and no engagements recorded yet." />
        ) : (
          <div className="space-y-8">
            {mappedPartners.length > 0 ? (
              <div className="space-y-4">
                {mappedPartners.map((p) => (
                  <PartnerCard key={p.id} partner={p} />
                ))}
              </div>
            ) : null}

            {profile.partnerContributions.length > 0 ? (
              <div>
                <p className="label-caps mb-4">Engagement timeline</p>
                <div className="relative space-y-6 pl-8">
                  <span className="absolute left-[3px] top-2 h-[calc(100%-16px)] w-0.5 bg-border" />
                  {profile.partnerContributions.map((entry, i) => (
                    <div key={i} className="relative">
                      <span className="absolute -left-[33px] top-1 size-3 rounded-full bg-primary ring-4 ring-background" />
                      <p className="label-caps mb-1">
                        {entry.date}
                        {entry.stage ? ` · ${entry.stage}` : ""}
                      </p>
                      <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                      {entry.description ? (
                        <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                          {entry.description}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </CollapsibleCard>

      {/* Financial data table popup */}
      <Dialog open={tableOpen} onOpenChange={setTableOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Financial data{fin.unit ? ` (${fin.unit})` : ""}</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-xl border border-border text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="border-b border-border p-3 text-left font-semibold text-muted-foreground">
                    Metric
                  </th>
                  {fin.years.map((year) => (
                    <th
                      key={year}
                      className="border-b border-border p-3 text-right font-semibold text-muted-foreground"
                    >
                      {year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fin.metrics.map((metric) => (
                  <tr key={metric.name}>
                    <td className="border-b border-border p-3 font-medium">{metric.name}</td>
                    {fin.years.map((_, i) => (
                      <td
                        key={i}
                        className={cn(
                          "border-b border-border p-3 text-right",
                          gradeClass[metric.grades[i] ?? "none"],
                        )}
                      >
                        {metric.values[i] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Colour grading reflects the sense of each figure — green healthy, amber flat, red
            decline / loss.
          </p>
        </DialogContent>
      </Dialog>

      {/* Vertical click-in popups */}
      <Dialog open={!!popup} onOpenChange={(v) => !v && setPopup(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {popup?.v.name} — {popup ? POPUP_TITLE[popup.kind] : ""}
            </DialogTitle>
          </DialogHeader>

          {popup?.kind === "stakeholders" ? (
            <StakeholderList people={popup.v.stakeholders} />
          ) : null}

          {popup?.kind === "engagementModel" ? <ChannelEngagement v={popup.v} /> : null}

          {popup?.kind === "contributions" ? (
            popup.v.contributions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                To be defined — add contributions in the editor.
              </p>
            ) : (
              <div className="space-y-4">
                {popup.v.contributions.map((c, i) => (
                  <div key={i} className="rounded-xl border border-border bg-muted/40 p-4">
                    {c.stakeholders ? (
                      <span className="inline-block rounded-md bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
                        {c.stakeholders}
                      </span>
                    ) : null}
                    <p className="mt-2 font-display text-base font-bold text-foreground">
                      {c.model || "Model (unnamed)"}
                    </p>
                    <p className="mt-3 label-caps">What happens here?</p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground">
                      {c.whatHappens || "Not captured yet."}
                    </p>
                  </div>
                ))}
              </div>
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- partner ---------- */

function PartnerCard({ partner }: { partner: Partner }) {
  const [zoom, setZoom] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-6">
      <div className="flex flex-col items-start gap-5 sm:flex-row">
        {partner.photo_url ? (
          <button
            type="button"
            onClick={() => setZoom(true)}
            className="shrink-0 cursor-zoom-in"
            aria-label={`Enlarge photo of ${partner.name}`}
          >
            <img
              src={partner.photo_url}
              alt={partner.name}
              className="size-28 rounded-xl border border-border object-cover"
            />
          </button>
        ) : (
          <Avatar src="" name={partner.name} size="size-28 text-2xl rounded-xl" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-bold text-foreground">{partner.name}</p>
          {partner.linkedin_url ? (
            <a
              href={partner.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Linkedin className="size-4" /> LinkedIn profile
            </a>
          ) : null}
          {partner.experience.length > 0 ? (
            <>
              <p className="label-caps mt-4">Experience</p>
              <ul className="mt-1.5 grid gap-x-8 gap-y-2 md:grid-cols-2">
                {partner.experience.map((e, i) => (
                  <li key={i} className="text-sm text-foreground">
                    <span className="font-semibold">{e.role || "Role"}</span>
                    {e.organisation ? (
                      <span className="text-muted-foreground"> · {e.organisation}</span>
                    ) : null}
                    {e.period ? <span className="text-muted-foreground"> · {e.period}</span> : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>

      {partner.photo_url ? (
        <Dialog open={zoom} onOpenChange={setZoom}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{partner.name}</DialogTitle>
            </DialogHeader>
            <img
              src={partner.photo_url}
              alt={partner.name}
              className="w-full rounded-xl border border-border object-contain"
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

/* ---------- stakeholders ---------- */

function StakeholderCard({ k }: { k: Stakeholder }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4">
      <div className="flex items-start gap-3">
        <Avatar src={k.photoUrl} name={k.name} />
        <div className="min-w-0">
          <p className="font-display text-base font-bold text-foreground">{k.name || "Unnamed"}</p>
          {k.role ? <p className="text-sm text-muted-foreground">{k.role}</p> : null}
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Position in hierarchy" value={k.hierarchy} />
        <Field label="Current" value={k.experienceCurrent} />
        <Field label="Education — UG" value={k.educationUG} />
        <Field label="Education — PG" value={k.educationPG} />
        <div className="sm:col-span-2">
          <Field label="Previous experience" value={k.experiencePrevious} />
        </div>
      </div>
      {k.note ? (
        <p className="mt-3 rounded-lg bg-muted/60 p-2.5 text-xs leading-relaxed text-muted-foreground">
          {k.note}
        </p>
      ) : null}
    </div>
  );
}

const STAKEHOLDER_TABS = [
  { id: "management", label: "Management heads", match: /manage|leadership|chair|board|md\b|ceo/i },
  { id: "business", label: "Business head", match: /business head|vertical head|bu head/i },
  { id: "functional", label: "Functional heads", match: /function|chro|hr\b|sales|market|cfo|cmo|cto/i },
] as const;

function stakeholderBucket(category: string): string {
  const c = category.trim();
  const hit = STAKEHOLDER_TABS.find((t) => t.match.test(c));
  return hit ? hit.id : "functional";
}

function StakeholderList({ people }: { people: Stakeholder[] }) {
  if (people.length === 0) {
    return <p className="text-sm text-muted-foreground">No stakeholders captured yet.</p>;
  }

  const byTab: Record<string, Stakeholder[]> = { management: [], business: [], functional: [] };
  for (const k of people) {
    const bucket = byTab[stakeholderBucket(k.category)];
    if (bucket) bucket.push(k);
  }

  return (
    <Tabs defaultValue={STAKEHOLDER_TABS.find((t) => (byTab[t.id]?.length ?? 0) > 0)?.id ?? "management"}>
      <TabsList className="flex-wrap">
        {STAKEHOLDER_TABS.map((t) => (
          <TabsTrigger key={t.id} value={t.id}>
            {t.label}
            {byTab[t.id]?.length ? (
              <span className="ml-1.5 rounded-full bg-background/60 px-1.5 text-[10px] font-bold">
                {byTab[t.id]?.length}
              </span>
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>
      {STAKEHOLDER_TABS.map((t) => (
        <TabsContent key={t.id} value={t.id} className="space-y-4 pt-4">
          {(byTab[t.id]?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">None captured under this category.</p>
          ) : (
            (byTab[t.id] ?? []).map((k, i) => <StakeholderCard key={i} k={k} />)
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

/* ---------- verticals ---------- */

const CATEGORY_COLORS: { match: RegExp; color: string }[] = [
  { match: /technolog/i, color: "#2E75B6" },
  { match: /train/i, color: "#548235" },
  { match: /process/i, color: "#BF8F00" },
  { match: /financ/i, color: "#7030A0" },
  { match: /capacity|infra/i, color: "#C00000" },
  { match: /sustainab/i, color: "#375623" },
];

function categoryColor(category: string): string {
  return CATEGORY_COLORS.find((c) => c.match.test(category))?.color ?? "#64748b";
}

function VerticalColumn({
  v,
  onOpen,
}: {
  v: Vertical;
  onOpen: (kind: VerticalPopup["kind"]) => void;
}) {
  const hasRevenue =
    !!v.revenueValue || !!v.revenueGrowth || v.revenueContributors.length > 0 || !!v.revenueDetails;
  const hasEngagement =
    v.engagementModel.length > 0 ||
    v.channelStats.length > 0 ||
    !!v.engagementMapUrl ||
    !!v.channelMethodology;

  return (
    <div className="relative w-[400px] shrink-0 border-l-2 border-primary pl-8">
      <span className="absolute -left-[11px] top-0 size-5 rounded-full border-4 border-primary bg-card" />

      <div className="mb-4">
        <h4 className="font-display text-2xl font-bold text-foreground">{v.name}</h4>
        {v.description ? (
          <p className="mt-2 text-sm text-muted-foreground">{v.description}</p>
        ) : null}
        {v.shareOfRevenue ? (
          <span className="mt-2 inline-block rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
            {v.shareOfRevenue}
          </span>
        ) : null}
      </div>

      {v.basicDetails ? (
        <div className="mb-4">
          <span className="label-caps">Basic details</span>
          <p className="mt-1 whitespace-pre-line text-sm text-foreground">{v.basicDetails}</p>
        </div>
      ) : null}

      {hasRevenue ? (
        <div className="mb-4 rounded-xl border border-border bg-muted/40 p-4">
          <span className="label-caps">Revenue</span>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-xl font-bold text-foreground">
              {v.revenueValue || "—"}
            </span>
            {v.revenueGrowth ? (
              <span className="rounded-full bg-good-soft px-2 py-0.5 text-xs font-bold text-good-foreground">
                {v.revenueGrowth}
              </span>
            ) : null}
          </div>
          {v.revenueDetails ? (
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
              {v.revenueDetails}
            </p>
          ) : null}
          {v.revenueContributors.length > 0 ? (
            <div className="mt-3">
              <span className="label-caps">Major contributors</span>
              <ul className="mt-1 space-y-1.5">
                {v.revenueContributors.map((c, i) => (
                  <li key={i} className="text-sm text-foreground">
                    <span className="font-semibold">{c.name}</span>
                    {c.detail ? <span className="text-muted-foreground"> — {c.detail}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {v.revenueInsight ? (
        <div className="mb-4 rounded-xl border border-border bg-card p-4">
          <span className="label-caps">Revenue detail</span>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground">
            {v.revenueInsight}
          </p>
        </div>
      ) : null}

      {v.mixChartUrl ? (
        <div className="mb-4">
          <ImageFigure src={v.mixChartUrl} title="Revenue / volume mix" caption={v.mixChartCaption} />
        </div>
      ) : null}

      <div className="space-y-2">
        {v.stakeholders.length > 0 ? (
          <ClickIn
            label="Stakeholders"
            count={v.stakeholders.length}
            onClick={() => onOpen("stakeholders")}
          />
        ) : null}
        {hasEngagement ? (
          <ClickIn label="Channel engagement model" onClick={() => onOpen("engagementModel")} />
        ) : null}
        <ClickIn
          label="Illumine's potential contributions"
          count={v.contributions.length}
          highlight
          onClick={() => onOpen("contributions")}
        />
      </div>
    </div>
  );
}

function ChannelEngagement({ v }: { v: Vertical }) {
  const hasAnything =
    v.engagementModel.length > 0 ||
    !!v.engagementMapUrl ||
    v.channelStats.length > 0 ||
    !!v.channelMethodology;

  if (!hasAnything) {
    return (
      <p className="text-sm text-muted-foreground">
        No channel engagement details captured for this vertical yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {v.channelModelName ? (
        <p className="text-sm font-semibold text-foreground">{v.channelModelName}</p>
      ) : null}

      {v.engagementModel.length > 0 ? (
        <SubCard title="How the engagement works">
          <BulletList items={v.engagementModel} />
        </SubCard>
      ) : null}

      {v.engagementMapUrl ? (
        <SubCard title="Engagement map">
          <img
            src={v.engagementMapUrl}
            alt="Stakeholder engagement map"
            className="max-h-[50vh] w-full rounded-lg border border-border bg-card object-contain p-2"
          />
        </SubCard>
      ) : null}

      {v.channelStats.length > 0 ? (
        <SubCard title="Dealers, executives & salesforce">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {v.channelStats.map((s, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-3">
                <p className="font-display text-xl font-bold text-foreground">{s.value || "—"}</p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </SubCard>
      ) : null}

      {v.channelMethodology ? (
        <p className="whitespace-pre-line rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
          <span className="font-bold">Methodology: </span>
          {v.channelMethodology}
        </p>
      ) : null}
    </div>
  );
}

function ClickIn({
  label,
  count,
  onClick,
  highlight,
}: {
  label: string;
  count?: number;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <Button
      variant={highlight ? "secondary" : "ghost"}
      onClick={onClick}
      className={cn(
        "w-full justify-between gap-2 rounded-lg bg-muted px-4 py-3 text-left text-sm font-medium hover:bg-accent",
        highlight && "bg-good-soft text-good-foreground hover:bg-good-soft/80 font-bold",
      )}
    >
      <span>
        {label}
        {typeof count === "number" && count > 0 ? (
          <span className="ml-2 rounded-full bg-background/60 px-1.5 py-0.5 text-[10px] font-bold">
            {count}
          </span>
        ) : null}
      </span>
      <span aria-hidden>→</span>
    </Button>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
      {text}
    </p>
  );
}
