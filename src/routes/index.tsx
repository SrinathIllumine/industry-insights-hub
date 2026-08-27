import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell, PageHeading } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  companyCountsQuery,
  deleteIndustry,
  industriesQuery,
  upsertIndustry,
} from "@/lib/research-data";
import type { Industry } from "@/lib/research-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Industry Research — Industry Research Engine for Retailer Enablement System" },
      {
        name: "description",
        content:
          "Browse industry verticals and open decision-grade company research profiles for leadership review.",
      },
      { property: "og:title", content: "Industry Research — Industry Research Engine for Retailer Enablement System" },
      {
        property: "og:description",
        content: "Browse industry verticals and open company research profiles.",
      },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(industriesQuery);
    void context.queryClient.ensureQueryData(companyCountsQuery);
  },
  component: IndustriesPage,
  errorComponent: ({ error }) => (
    <AppShell>
      <p role="alert" className="text-sm text-destructive">
        {error.message}
      </p>
    </AppShell>
  ),
});

function initials(industry: Industry) {
  if (industry.code) return industry.code;
  return industry.name.slice(0, 4).toUpperCase();
}

function IndustriesPage() {
  const { data: industries } = useSuspenseQuery(industriesQuery);
  const { data: counts } = useSuspenseQuery(companyCountsQuery);
  const [manageOpen, setManageOpen] = useState(false);

  return (
    <AppShell>
      <PageHeading
        title="Industry Research"
        subtitle="Select an industry to explore its company research profiles."
        action={
          <Button variant="outline" className="rounded-full" onClick={() => setManageOpen(true)}>
            Edit industries
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
        {industries.map((industry) => (
          <Link
            key={industry.id}
            to="/industry/$industryId"
            params={{ industryId: industry.id }}
            className="group flex cursor-pointer flex-col items-center gap-4 text-center"
          >
            <div className="flex size-32 items-center justify-center rounded-full border-2 border-border bg-card shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:border-primary">
              <span className="px-3 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors group-hover:text-foreground">
                {initials(industry)}
              </span>
            </div>
            <div>
              <span className="block font-semibold text-foreground">{industry.name}</span>
              <span className="text-[11px] font-medium uppercase tracking-tight text-muted-foreground">
                {counts[industry.id] ?? 0} companies
              </span>
            </div>
          </Link>
        ))}
      </div>

      {industries.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          No industries yet — use “Edit industries” to add your first one.
        </p>
      ) : null}

      <ManageIndustriesDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        industries={industries}
      />
    </AppShell>
  );
}

function ManageIndustriesDialog({
  open,
  onOpenChange,
  industries,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  industries: Industry[];
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [editing, setEditing] = useState<Partial<Industry> | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["industries"] });
    await queryClient.invalidateQueries({ queryKey: ["company-counts"] });
    void router.invalidate();
  };

  const save = async () => {
    if (!editing?.name?.trim()) {
      toast.error("Industry name is required");
      return;
    }
    setSaving(true);
    try {
      await upsertIndustry({
        ...(editing.id ? { id: editing.id } : {}),
        name: editing.name.trim(),
        code: (editing.code ?? "").trim().toUpperCase(),
        sort_order: Number(editing.sort_order ?? industries.length + 1),
      });
      await refresh();
      setEditing(null);
      toast.success("Industry saved");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteIndustry(id);
      await refresh();
      toast.success("Industry removed");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Industries</DialogTitle>
          <DialogDescription>
            Add, rename or remove the industries shown on the home screen.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {industries.map((industry) => (
            <div
              key={industry.id}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold">{industry.name}</p>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  {industry.code || "—"}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => setEditing(industry)}>
                  <Pencil className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(industry.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {editing ? (
          <div className="space-y-3 rounded-xl border border-border p-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Short code</Label>
                <Input
                  value={editing.code ?? ""}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <DialogFooter className="sm:justify-start">
            <Button
              variant="outline"
              onClick={() => setEditing({ name: "", code: "", sort_order: industries.length + 1 })}
            >
              <Plus className="size-4" /> Add industry
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
