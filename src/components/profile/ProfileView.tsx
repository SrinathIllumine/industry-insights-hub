import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CompanyProfile, Grade, Vertical } from "@/lib/research-types";

const gradeClass: Record<Grade, string> = {
  good: "bg-good-soft text-good-foreground font-semibold",
  warn: "bg-warn-soft text-warn-foreground font-semibold",
  bad: "bg-bad-soft text-bad-foreground font-semibold",
  none: "text-foreground",
};

function BlockHeading({ index, title }: { index: string; title: string }) {
  return (
    <h3 className="mb-6 flex items-center gap-2 font-display text-lg font-bold text-foreground">
      <span className="size-2 rounded-full bg-primary" />
      {index}. {title}
    </h3>
  );
}

export function ProfileView({ profile }: { profile: CompanyProfile }) {
  const [chartOpen, setChartOpen] = useState(false);
  const [vertical, setVertical] = useState<{ v: Vertical; field: keyof Vertical } | null>(null);
  const fin = profile.financials;

  return (
    <div className="space-y-8">
      {/* Block 1: Financials */}
      <section className="border-t border-border pt-10">
        <BlockHeading index="I" title="Financial Performance" />
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-xl border border-border text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="border-b border-border p-4 text-left font-semibold text-muted-foreground">
                    Metric{fin.unit ? ` (${fin.unit})` : ""}
                  </th>
                  {fin.years.map((year) => (
                    <th
                      key={year}
                      className="border-b border-border p-4 text-right font-semibold text-muted-foreground"
                    >
                      {year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fin.metrics.map((metric) => (
                  <tr key={metric.name}>
                    <td className="border-b border-border p-4 font-medium">{metric.name}</td>
                    {fin.years.map((_, i) => (
                      <td
                        key={i}
                        className={cn(
                          "border-b border-border p-4 text-right",
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

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-muted p-4">
                <span className="label-caps">Revenue CAGR</span>
                <p className="font-display text-2xl font-bold text-foreground">
                  {fin.revenueCagr || "—"}
                </p>
              </div>
              <div className="rounded-xl bg-muted p-4">
                <span className="label-caps">Industry CAGR</span>
                <p className="font-display text-2xl font-bold text-foreground">
                  {fin.industryCagr || "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl bg-primary p-6 text-primary-foreground">
              <span className="text-[11px] font-bold uppercase tracking-widest opacity-70">
                Overall verdict
              </span>
              <p className="mt-2 font-display text-2xl font-bold">
                {fin.verdict || "Not assessed"}
              </p>
              {fin.verdictNote ? (
                <p className="mt-3 text-sm opacity-80">{fin.verdictNote}</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setChartOpen(true)}
              className="grid w-full cursor-zoom-in place-items-center overflow-hidden rounded-xl border border-border bg-muted"
            >
              {fin.benchmarkImageUrl ? (
                <img
                  src={fin.benchmarkImageUrl}
                  alt="Where the company stands in the industry"
                  className="aspect-[2/1] w-full object-cover"
                />
              ) : (
                <span className="grid aspect-[2/1] w-full place-items-center px-4 text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  Click to see where the company stands in the industry
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Block 2: Challenges */}
      <section className="border-t border-border pt-10">
        <BlockHeading index="II" title="Overall Business Challenge / Aspiration" />
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
                <p className="text-lg font-medium leading-relaxed text-foreground">
                  {challenge.problem}
                </p>
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
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Block 3: Verticals */}
      <section className="border-t border-border pt-10">
        <BlockHeading index="III" title="Business Verticals" />
        {profile.verticals.length === 0 ? (
          <Empty text="No business verticals captured yet." />
        ) : (
          <div className="flex gap-12 overflow-x-auto pb-6">
            {profile.verticals.map((v, i) => (
              <div key={i} className="relative w-[380px] shrink-0 border-l-2 border-primary pl-8">
                <span className="absolute -left-[11px] top-0 size-5 rounded-full border-4 border-primary bg-card" />
                <div className="mb-6">
                  <h4 className="font-display text-2xl font-bold text-foreground">{v.name}</h4>
                  <p className="mt-2 text-sm text-muted-foreground">{v.description}</p>
                </div>
                {v.basicDetails ? (
                  <div className="mb-4">
                    <span className="label-caps">Basic details</span>
                    <p className="mt-1 whitespace-pre-line text-sm text-foreground">
                      {v.basicDetails}
                    </p>
                  </div>
                ) : null}
                {v.revenueDetails ? (
                  <div className="mb-6">
                    <span className="label-caps">Revenue details</span>
                    <p className="mt-1 whitespace-pre-line text-sm text-foreground">
                      {v.revenueDetails}
                    </p>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <ClickIn label="Stakeholders" onClick={() => setVertical({ v, field: "stakeholders" })} />
                  <ClickIn
                    label="Channel engagement model"
                    onClick={() => setVertical({ v, field: "engagementModel" })}
                  />
                  <ClickIn
                    label="Illumine's potential contributions"
                    highlight
                    onClick={() => setVertical({ v, field: "contributions" })}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Block 4: Company-level research */}
      <section className="border-t border-border pt-10">
        <BlockHeading index="IV" title="Company-level Research" />
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
      </section>

      {/* Block 5: Partner contributions */}
      <section className="border-t border-border pt-10">
        <BlockHeading index="V" title="Partner Contributions" />
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
      </section>

      <Dialog open={chartOpen} onOpenChange={setChartOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Where the company stands in the industry</DialogTitle>
          </DialogHeader>
          {fin.benchmarkImageUrl ? (
            <img
              src={fin.benchmarkImageUrl}
              alt="Industry benchmark chart"
              className="w-full rounded-xl border border-border"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No benchmark chart added yet. Add a chart image URL from the edit screen.
            </p>
          )}
          <p className="text-sm text-muted-foreground">{fin.benchmarkNote}</p>
        </DialogContent>
      </Dialog>

      <Dialog open={!!vertical} onOpenChange={(v) => !v && setVertical(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {vertical?.v.name} —{" "}
              {vertical?.field === "stakeholders"
                ? "Stakeholders"
                : vertical?.field === "engagementModel"
                  ? "Channel engagement model"
                  : "Illumine's potential contributions"}
            </DialogTitle>
          </DialogHeader>
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
            {(vertical ? (vertical.v[vertical.field] as string) : "") || "Nothing captured yet."}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClickIn({
  label,
  onClick,
  highlight,
}: {
  label: string;
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
      {label}
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
