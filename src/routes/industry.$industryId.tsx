import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
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
  companiesQuery,
  createCompany,
  deleteCompany,
  industryQuery,
} from "@/lib/research-data";

export const Route = createFileRoute("/industry/$industryId")({
  head: () => ({
    meta: [
      { title: "Industry companies — Industry Research Engine" },
      {
        name: "description",
        content: "Company research profiles tracked within this industry vertical.",
      },
      { property: "og:title", content: "Industry companies — Industry Research Engine" },
      {
        property: "og:description",
        content: "Company research profiles tracked within this industry vertical.",
      },
    ],
  }),
  loader: ({ context, params }) => {
    void context.queryClient.ensureQueryData(industryQuery(params.industryId));
    void context.queryClient.ensureQueryData(companiesQuery(params.industryId));
  },
  component: IndustryPage,
  errorComponent: ({ error }) => (
    <AppShell>
      <p role="alert" className="text-sm text-destructive">
        {error.message}
      </p>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <p className="text-sm text-muted-foreground">Industry not found.</p>
    </AppShell>
  ),
});

function IndustryPage() {
  const { industryId } = Route.useParams();
  const { data: industry } = useSuspenseQuery(industryQuery(industryId));
  const { data: companies } = useSuspenseQuery(companiesQuery(industryId));
  const [open, setOpen] = useState(false);

  return (
    <AppShell>
      <PageHeading
        title={industry?.name ?? "Industry"}
        subtitle="Select a company to open its research profile."
        breadcrumb={
          <>
            <Link to="/" className="hover:text-foreground">
              Industry Research
            </Link>
            <span className="text-border">/</span>
            <span className="text-foreground">{industry?.name}</span>
          </>
        }
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Add company
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => (
          <Link
            key={company.id}
            to="/company/$companyId"
            params={{ companyId: company.id }}
            className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">{company.name}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {company.tagline || "No one-liner yet."}
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {company.profile.financials.verdict || "Verdict pending"}
              </span>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
            </div>
          </Link>
        ))}
      </div>

      {companies.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No companies in this industry yet. Add your first company research profile.
        </p>
      ) : null}

      {companies.length > 0 ? (
        <div className="mt-10 space-y-2">
          <h3 className="label-caps">Manage</h3>
          {companies.map((company) => (
            <div
              key={company.id}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-2.5"
            >
              <span className="text-sm font-medium">{company.name}</span>
              <RemoveCompanyButton id={company.id} industryId={industryId} />
            </div>
          ))}
        </div>
      ) : null}

      <AddCompanyDialog open={open} onOpenChange={setOpen} industryId={industryId} />
    </AppShell>
  );
}

function RemoveCompanyButton({ id, industryId }: { id: string; industryId: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={async () => {
        try {
          await deleteCompany(id);
          await queryClient.invalidateQueries({ queryKey: ["companies", industryId] });
          await queryClient.invalidateQueries({ queryKey: ["company-counts"] });
          void router.invalidate();
          toast.success("Company removed");
        } catch (error) {
          toast.error((error as Error).message);
        }
      }}
    >
      <Trash2 className="size-4 text-destructive" />
    </Button>
  );
}

function AddCompanyDialog({
  open,
  onOpenChange,
  industryId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  industryId: string;
}) {
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New company research profile</DialogTitle>
          <DialogDescription>
            Create the profile, then add or import the five research blocks.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Company name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>One-liner</Label>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={saving}
            onClick={async () => {
              if (!name.trim()) {
                toast.error("Company name is required");
                return;
              }
              setSaving(true);
              try {
                const id = await createCompany({
                  industry_id: industryId,
                  name: name.trim(),
                  tagline: tagline.trim(),
                });
                await queryClient.invalidateQueries({ queryKey: ["companies", industryId] });
                await queryClient.invalidateQueries({ queryKey: ["company-counts"] });
                onOpenChange(false);
                setName("");
                setTagline("");
                void navigate({ to: "/company/$companyId", params: { companyId: id } });
              } catch (error) {
                toast.error((error as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            Create profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
