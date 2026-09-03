import { useEffect, useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { BarChart3, Pencil, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BubbleMatrix } from "@/components/industry/BubbleMatrix";
import {
  deleteIndustrySnapshot,
  emptySnapshot,
  industrySnapshotQuery,
  parseSnapshotHtml,
  saveIndustrySnapshot,
  type IndustrySnapshot as Snapshot,
  type SnapshotChart,
} from "@/lib/industry-snapshot";

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];

export function IndustrySnapshot({
  industryId,
  industryName,
}: {
  industryId: string;
  industryName: string;
}) {
  const { data: snapshot } = useSuspenseQuery(industrySnapshotQuery(industryId));
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <section className="mb-8 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-lg bg-muted p-2 text-muted-foreground">
            <BarChart3 className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Industry snapshot</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {snapshot
                ? `Dominant go-to-market models and ${snapshot.charts.length} growth vs profitability ${
                    snapshot.charts.length === 1 ? "matrix" : "matrices"
                  }.`
                : "Add a snapshot: dominant go-to-market models plus growth vs profitability matrices per vertical."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {snapshot ? <Button onClick={() => setViewOpen(true)}>View snapshot</Button> : null}
          <Button
            variant="outline"
            size={snapshot ? "icon" : "default"}
            onClick={() => setEditOpen(true)}
            aria-label="Edit industry snapshot"
          >
            <Pencil className="size-4" />
            {snapshot ? null : <span className="ml-2">Add snapshot</span>}
          </Button>
        </div>
      </div>

      {snapshot ? (
        <SnapshotViewDialog
          open={viewOpen}
          onOpenChange={setViewOpen}
          industryName={industryName}
          snapshot={snapshot}
        />
      ) : null}
      <SnapshotEditDialog
        key={editOpen ? "open" : "closed"}
        open={editOpen}
        onOpenChange={setEditOpen}
        industryId={industryId}
        existing={snapshot}
      />
    </section>
  );
}

function SnapshotViewDialog({
  open,
  onOpenChange,
  industryName,
  snapshot,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  industryName: string;
  snapshot: Snapshot;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{industryName} — industry snapshot</DialogTitle>
          <DialogDescription>
            Market structure and where each player sits on growth vs profitability.
          </DialogDescription>
        </DialogHeader>

        {snapshot.dominantModels.length > 0 ? (
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="label-caps">Dominant go-to-market models</p>
            <ol className="mt-2 space-y-1.5">
              {snapshot.dominantModels.map((model, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground">
                  <span className="font-semibold text-muted-foreground">
                    ({ROMAN[i] ?? String(i + 1)})
                  </span>
                  <span>{model}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {snapshot.intro ? (
          <p className="whitespace-pre-line text-sm text-muted-foreground">{snapshot.intro}</p>
        ) : null}

        <div className="space-y-8">
          {snapshot.charts.map((chart, i) => (
            <div key={i}>
              <h3 className="font-display text-base font-bold text-foreground">{chart.title}</h3>
              <div className="mt-2">
                <BubbleMatrix chart={chart} />
              </div>
            </div>
          ))}
        </div>

        {snapshot.charts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matrices captured yet.</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SnapshotEditDialog({
  open,
  onOpenChange,
  industryId,
  existing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  industryId: string;
  existing: Snapshot | null;
}) {
  const queryClient = useQueryClient();
  const [models, setModels] = useState("");
  const [intro, setIntro] = useState("");
  const [charts, setCharts] = useState<SnapshotChart[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setModels((existing?.dominantModels ?? []).join("\n"));
    setIntro(existing?.intro ?? "");
    setCharts(existing?.charts ?? []);
  }, [existing, open]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const html = await file.text();
      const parsed = parseSnapshotHtml(html);
      if (parsed.length === 0) {
        toast.error("No bubble matrices found in that HTML file.");
        return;
      }
      setCharts(parsed);
      toast.success(
        `Parsed ${parsed.length} ${parsed.length === 1 ? "matrix" : "matrices"} (${parsed.reduce(
          (n, c) => n + c.points.length,
          0,
        )} companies).`,
      );
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const next: Snapshot = {
        ...emptySnapshot(),
        dominantModels: models
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        intro: intro.trim(),
        charts,
      };
      await saveIndustrySnapshot(industryId, next);
      await queryClient.invalidateQueries({ queryKey: ["industry-snapshot", industryId] });
      toast.success("Industry snapshot saved");
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteIndustrySnapshot(industryId);
      await queryClient.invalidateQueries({ queryKey: ["industry-snapshot", industryId] });
      toast.success("Industry snapshot removed");
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Industry snapshot</DialogTitle>
          <DialogDescription>
            Upload a bubble-matrix HTML export to load the growth vs profitability charts, then add
            the dominant go-to-market models.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Matrices HTML file</Label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground hover:bg-muted/60">
              <Upload className="size-4" />
              <span>Choose an HTML file…</span>
              <input
                type="file"
                accept=".html,.htm,text/html"
                className="hidden"
                onChange={(e) => void onFile(e.target.files?.[0] ?? undefined)}
              />
            </label>
            {charts.length > 0 ? (
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {charts.map((c, i) => (
                  <li key={i}>
                    ✓ {c.title} — {c.points.length} companies
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                No matrices loaded yet{existing?.charts.length ? " (existing charts kept)" : ""}.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Dominant go-to-market models (one per line)</Label>
            <Textarea
              rows={3}
              value={models}
              onChange={(e) => setModels(e.target.value)}
              placeholder={"Direct to Retailer / Franchisee Owner / Dealer model\nInstitutional Sales model"}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Intro note (optional)</Label>
            <Textarea
              rows={2}
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              placeholder="Short framing note shown above the matrices."
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          {existing ? (
            <Button variant="ghost" disabled={busy} onClick={() => void remove()} className="text-destructive">
              Remove snapshot
            </Button>
          ) : (
            <span />
          )}
          <Button disabled={busy} onClick={() => void save()}>
            Save snapshot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
