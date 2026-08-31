import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24">
      <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card/80 px-6 py-4 backdrop-blur-md md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/illumine-logo.svg"
            alt="Illumine"
            className="h-11 w-auto shrink-0 rounded dark:bg-white dark:p-1"
          />
          <span className="hidden max-w-[15rem] border-l border-border pl-3 text-xs font-semibold uppercase leading-tight tracking-[0.16em] text-muted-foreground md:block">
            Industry Research Engine for Retail Enablement System
          </span>
        </Link>
        <div className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            activeProps={{ className: "text-foreground" }}
            className="hover:text-foreground"
          >
            Industry Research
          </Link>
          <Link
            to="/settings"
            activeProps={{ className: "text-foreground" }}
            className="hover:text-foreground"
          >
            Settings
          </Link>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-6 py-12 md:px-8">{children}</main>
    </div>
  );
}

export function PageHeading({
  title,
  subtitle,
  breadcrumb,
  action,
}: {
  title: string;
  subtitle?: string;
  breadcrumb?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        {breadcrumb ? (
          <nav className="mb-3 flex gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {breadcrumb}
          </nav>
        ) : null}
        <h1 className="font-display text-4xl font-bold text-foreground">{title}</h1>
        {subtitle ? <p className="mt-2 text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
