import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { toast } from "sonner";

import { AppShell, PageHeading } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { ProfileView } from "@/components/profile/ProfileView";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import {
  companyQuery,
  industryQuery,
  saveCompany,
  settingsQuery,
} from "@/lib/research-data";
import { emptyProfile, type CompanyProfile } from "@/lib/research-types";

export const Route = createFileRoute("/company/$companyId")({
  head: () => ({
    meta: [
      { title: "Company research profile — Industry Research Engine" },
      {
        name: "description",
        content:
          "Decision-grade company research profile: financials, challenges, verticals, initiatives and partner contributions.",
      },
      { property: "og:title", content: "Company research profile — Industry Research Engine" },
      {
        property: "og:description",
        content: "Financials, challenges, verticals, initiatives and partner contributions.",
      },
    ],
  }),
  loader: ({ context, params }) => {
    void context.queryClient.ensureQueryData(companyQuery(params.companyId));
    void context.queryClient.ensureQueryData(settingsQuery);
  },
  component: CompanyPage,
  errorComponent: ({ error }) => (
    <AppShell>
      <p role="alert" className="text-sm text-destructive">
        {error.message}
      </p>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <p className="text-sm text-muted-foreground">Company not found.</p>
    </AppShell>
  ),
});

function CompanyPage() {
  const { companyId } = Route.useParams();
  const { data: company } = useSuspenseQuery(companyQuery(companyId));
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const { data: industry } = useSuspenseQuery(
    industryQuery(company?.industry_id ?? ""),
  );

  const queryClient = useQueryClient();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<{
    name: string;
    tagline: string;
    profile: CompanyProfile;
  } | null>(null);

  if (!company) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Company not found.</p>
      </AppShell>
    );
  }

  const startEditing = () => {
    setDraft({
      name: company.name,
      tagline: company.tagline,
      profile: company.profile ?? emptyProfile(),
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setDraft(null);
    setEditing(false);
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("Company name is required");
      return;
    }
    setSaving(true);
    try {
      await saveCompany({
        id: company.id,
        name: draft.name.trim(),
        tagline: draft.tagline.trim(),
        profile: draft.profile,
      });
      await queryClient.invalidateQueries({ queryKey: ["company", company.id] });
      await queryClient.invalidateQueries({ queryKey: ["companies", company.industry_id] });
      void router.invalidate();
      setEditing(false);
      setDraft(null);
      toast.success("Profile saved");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <PageHeading
        title={editing ? `Editing — ${company.name}` : company.name}
        subtitle={editing ? undefined : company.tagline || undefined}
        breadcrumb={
          <>
            <Link to="/" className="hover:text-foreground">
              Industries
            </Link>
            <span className="text-border">/</span>
            {industry ? (
              <Link
                to="/industry/$industryId"
                params={{ industryId: industry.id }}
                className="hover:text-foreground"
              >
                {industry.name}
              </Link>
            ) : (
              <span>Industry</span>
            )}
            <span className="text-border">/</span>
            <span className="text-foreground">{company.name}</span>
          </>
        }
        action={
          editing ? null : (
            <div className="flex gap-2">
              {industry ? (
                <Button asChild variant="ghost">
                  <Link to="/industry/$industryId" params={{ industryId: industry.id }}>
                    <ArrowLeft className="size-4" /> Back
                  </Link>
                </Button>
              ) : null}
              <Button onClick={startEditing}>
                <Pencil className="size-4" /> Edit / add data
              </Button>
            </div>
          )
        }
      />

      {editing && draft ? (
        <ProfileEditor
          name={draft.name}
          tagline={draft.tagline}
          profile={draft.profile}
          settings={settings}
          saving={saving}
          onChange={setDraft}
          onSave={save}
          onCancel={cancelEditing}
        />
      ) : (
        <ProfileView profile={company.profile ?? emptyProfile()} />
      )}
    </AppShell>
  );
}
