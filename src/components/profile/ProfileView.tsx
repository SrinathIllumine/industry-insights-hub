import { useState, type ReactNode } from "react";
import { ChevronDown, ExternalLink, Maximize2, Table2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  Challenge,
  CompanyProfile,
  FinancialChart,
  Grade,
  Vertical,
} from "@/lib/research-types";

const gradeClass: Record<Grade, string> = {
  good: "bg-good-soft text-good-foreground font-semibold",
  warn: "bg-warn-soft text-warn-foreground font-semibold",
  bad: "bg-bad-soft text-bad-foreground font-semibold",
  none: "text-foreground",
};

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
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">—</p>;
  }
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

function ChartCard({ chart }: { chart: FinancialChart }) {
  const [zoom, setZoom] = useState(false);
  return (
    <>
      <figure className="overflow-hidden rounded-xl border border-border bg-card">
        {chart.imageUrl ? (
          <button
            type="button"
            onClick={() => setZoom(true)}
            className="block w-full cursor-zoom-in bg-card"
          >
            <img
              src={chart.imageUrl}
              alt={chart.title || "Financial chart"}
              className="max-h-72 w-full object-contain p-3"
            />
          </button>
        ) : null}
        <figcaption className="space-y-1 border-t border-border p-4">
          {chart.title ? (
            <p className="font-display text-sm font-bold text-foreground">{chart.title}</p>
          ) : null}
          {chart.caption ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{chart.caption}</p>
          ) : null}
        </figcaption>
      </figure>

      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{chart.title || "Financial chart"}</DialogTitle>
          </DialogHeader>
          <img
            src={chart.imageUrl}
            alt={chart.title || "Financial chart"}
            className="max-h-[70vh] w-full rounded-xl border border-border bg-card object-contain p-2"
          />
          {chart.caption ? (
            <p className="text-sm text-muted-foreground">{chart.caption}</p>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ExpandableText({ text, clampLines = 4 }: { text: string; clampLines?: number }) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState(false);
  const isLong = text.length > 320 || text.split(/\r?\n/).length > clampLines;

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
            <DialogTitle>Problem — full explanation</DialogTitle>
          </DialogHeader>
          <p className="max-h-[70vh] overflow-y-auto whitespace-pre-line text-[15px] leading-relaxed text-foreground">
            {text}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Sources({ sources }: { sources: Challenge["sources"] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="label-caps">Sources</span>
      {sources.map((s, i) =>
        s.url ? (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground hover:border-primary"
          >
            <ExternalLink className="size-3" />
            {s.label}
          </a>
        ) : (
          <span
            key={i}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
          >
            {s.label}
          </span>
        ),
      )}
    </div>
  );
}

type VerticalPopup = {
  v: Vertical;
  kind: "stakeholders" | "engagementModel" | "contributions";
};

const POPUP_TITLE: Record<VerticalPopup["kind"], string> = {
  stakeholders: "Stakeholders",
  engagementModel: "Channel engagement model",
  contributions: "Illumine's potential contributions",
};

export function ProfileView({ profile }: { profile: CompanyProfile }) {
  const [tableOpen, setTableOpen] = useState(false);
  const [popup, setPopup] = useState<VerticalPopup | null>(null);
  const fin = profile.financials;

  const charts: FinancialChart[] = [
    ...(fin.benchmarkImageUrl || fin.benchmarkNote
      ? [
          {
            title: "Where the company stands in the industry",
            imageUrl: fin.benchmarkImageUrl,
            caption: fin.benchmarkNote,
          },
        ]
      : []),
    ...fin.charts,
  ];

  return (
    <div className="space-y-4">
      {/* Block 1: Financials — open by default */}
      <CollapsibleCard index="I" title="Financial Performance" defaultOpen>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-primary p-6 text-primary-foreground sm:col-span-1">
            <span className="text-[11px] font-bold uppercase tracking-widest opacity-70">
              Overall verdict
            </span>
            <p className="mt-2 font-display text-2xl font-bold">{fin.verdict || "Not assessed"}</p>
            {fin.verdictNote ? (
              <p className="mt-3 text-sm opacity-80">{fin.verdictNote}</p>
            ) : null}
          </div>
          <div className="rounded-2xl bg-muted p-6">
            <span className="label-caps">Company revenue CAGR</span>
            <p className="font-display text-3xl font-bold text-foreground">
              {fin.revenueCagr || "—"}
            </p>
            <span className="text-[11px] font-medium text-muted-foreground">5-year growth rate</span>
          </div>
          <div className="rounded-2xl bg-muted p-6">
            <span className="label-caps">Industry revenue CAGR</span>
            <p className="font-display text-3xl font-bold text-foreground">
              {fin.industryCagr || "—"}
            </p>
            <span className="text-[11px] font-medium text-muted-foreground">5-year growth rate</span>
          </div>
        </div>

        {charts.length > 0 ? (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {charts.map((chart, i) => (
              <ChartCard key={i} chart={chart} />
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No charts added yet — add chart images with a caption in the editor to drive the
            financial narrative.
          </p>
        )}

        <div className="mt-6">
          <Button variant="outline" onClick={() => setTableOpen(true)}>
            <Table2 className="size-4" /> View financial data table
          </Button>
        </div>

        {fin.narrative ? (
          <div className="mt-8 rounded-xl border-l-4 border-primary bg-muted/50 p-5">
            <span className="label-caps">Sense-making</span>
            <p className="mt-1 text-[15px] font-medium leading-relaxed text-foreground">
              {fin.narrative}
            </p>
          </div>
        ) : null}
      </CollapsibleCard>

      {/* Block 2: Challenges */}
      <CollapsibleCard index="II" title="Overall Business Challenge / Aspiration">
        {profile.challenges.length === 0 ? (
          <Empty text="No challenges captured yet." />
        ) : (
          <div className="space-y-6">
            {profile.challenges.map((challenge, i) => (
              <div key={i} className="rounded-2xl border border-border bg-muted/40 p-6">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <h4 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                    Theme: {challenge.theme || "Unassigned"}
                  </h4>
                  {challenge.tag ? (
                    <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase text-primary-foreground">
                      {challenge.tag}
                    </span>
                  ) : null}
                </div>

                {challenge.problem ? (
                  <ExpandableText text={challenge.problem} />
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}

                {challenge.quote ? (
                  <blockquote className="mt-4 border-l-2 border-border pl-4 italic text-muted-foreground">
                    “{challenge.quote}”
                    {challenge.quoteBy ? (
                      <cite className="mt-2 block text-xs font-bold uppercase not-italic text-muted-foreground">
                        — {challenge.quoteBy}
                      </cite>
                    ) : null}
                  </blockquote>
                ) : null}

                <Sources sources={challenge.sources} />
              </div>
            ))}
          </div>
        )}
      </CollapsibleCard>

      {/* Block 3: Verticals */}
      <CollapsibleCard index="III" title="Business Verticals">
        {profile.verticals.length === 0 ? (
          <Empty text="No business verticals captured yet." />
        ) : (
          <div className="flex gap-10 overflow-x-auto pb-6">
            {profile.verticals.map((v, i) => (
              <VerticalColumn key={i} v={v} onOpen={(kind) => setPopup({ v, kind })} />
            ))}
          </div>
        )}
      </CollapsibleCard>

      {/* Block 4: Company-level research */}
      <CollapsibleCard index="IV" title="Company-level Research">
        {profile.initiatives.length === 0 ? (
          <Empty text="No initiatives captured yet." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  {["Area", "Category", "Initiative", "What it does", "How it is done"].map((h) => (
                    <th key={h} className="p-4 text-left font-semibold text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profile.initiatives.map((row, i) => (
                  <tr key={i} className="border-t border-border align-top">
                    <td className="p-4 font-medium">{row.area}</td>
                    <td className="p-4">{row.category}</td>
                    <td className="p-4 font-medium">{row.initiative}</td>
                    <td className="p-4 text-muted-foreground">{row.whatItDoes}</td>
                    <td className="p-4 text-muted-foreground">{row.howItIsDone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleCard>

      {/* Block 5: Partner contributions */}
      <CollapsibleCard index="V" title="Partner Contributions">
        {profile.partnerContributions.length === 0 ? (
          <Empty text="No partner engagements recorded yet." />
        ) : (
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
        )}
      </CollapsibleCard>

      {/* Financial data table popup */}
      <Dialog open={tableOpen} onOpenChange={setTableOpen}>
        <DialogContent className="max-w-3xl">
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {popup?.v.name} — {popup ? POPUP_TITLE[popup.kind] : ""}
            </DialogTitle>
          </DialogHeader>

          {popup?.kind === "stakeholders" ? <BulletList items={popup.v.stakeholders} /> : null}

          {popup?.kind === "engagementModel" ? (
            <ChannelEngagement v={popup.v} />
          ) : null}

          {popup?.kind === "contributions" ? (
            popup.v.contributions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No models selected for this vertical yet.
              </p>
            ) : (
              <div className="space-y-4">
                {popup.v.contributions.map((c, i) => (
                  <div key={i} className="rounded-xl border border-border bg-muted/40 p-4">
                    <p className="font-display text-base font-bold text-foreground">
                      {c.model || "Model (unnamed)"}
                    </p>
                    <p className="mt-3 label-caps">How it can be configured for the company</p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground">
                      {c.configuration || "Not captured yet."}
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

function ChannelEngagement({ v }: { v: Vertical }) {
  const hasAnything =
    v.stakeholders.length > 0 ||
    v.engagementModel.length > 0 ||
    !!v.engagementMapUrl ||
    v.channelStats.length > 0 ||
    v.dealerChannelTypes.length > 0;

  if (!hasAnything) {
    return (
      <p className="text-sm text-muted-foreground">
        No channel engagement details captured for this vertical yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {v.stakeholders.length > 0 ? (
        <SubCard title="Stakeholders involved in the engagement">
          <BulletList items={v.stakeholders} />
        </SubCard>
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
        <SubCard title="Retail network — by the numbers">
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

      {v.dealerChannelTypes.length > 0 ? (
        <SubCard title="Types of dealers & channels">
          <div className="flex flex-wrap gap-2">
            {v.dealerChannelTypes.map((t, i) => (
              <span
                key={i}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        </SubCard>
      ) : null}
    </div>
  );
}

function VerticalColumn({
  v,
  onOpen,
}: {
  v: Vertical;
  onOpen: (kind: VerticalPopup["kind"]) => void;
}) {
  const hasRevenue =
    !!v.revenueValue ||
    !!v.revenueGrowth ||
    v.revenueContributors.length > 0 ||
    !!v.revenueDetails;

  return (
    <div className="relative w-[400px] shrink-0 border-l-2 border-primary pl-8">
      <span className="absolute -left-[11px] top-0 size-5 rounded-full border-4 border-primary bg-card" />
      <div className="mb-5">
        <h4 className="font-display text-2xl font-bold text-foreground">{v.name}</h4>
        {v.description ? (
          <p className="mt-2 text-sm text-muted-foreground">{v.description}</p>
        ) : null}
      </div>

      {v.basicDetails ? (
        <div className="mb-4">
          <span className="label-caps">Basic details</span>
          <p className="mt-1 whitespace-pre-line text-sm text-foreground">{v.basicDetails}</p>
        </div>
      ) : null}

      {hasRevenue ? (
        <div className="mb-5 rounded-xl border border-border bg-muted/40 p-4">
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
                    {c.detail ? (
                      <span className="text-muted-foreground"> — {c.detail}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <ClickIn
          label="Stakeholders"
          count={v.stakeholders.length}
          onClick={() => onOpen("stakeholders")}
        />
        <ClickIn
          label="Channel engagement model"
          count={
            v.stakeholders.length +
            v.engagementModel.length +
            v.channelStats.length +
            v.dealerChannelTypes.length +
            (v.engagementMapUrl ? 1 : 0)
          }
          onClick={() => onOpen("engagementModel")}
        />
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
        "w-full justify-between rounded-lg bg-muted px-4 py-3 text-sm font-medium hover:bg-accent",
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
