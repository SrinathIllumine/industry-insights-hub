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
            className="size-9 shrink-0"
            width={36}
            height={36}
          />
          <span className="flex flex-col leading-none">
            <span className="font-display text-base font-extrabold uppercase tracking-[0.2em] text-foreground">
              Illumine
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Industry Research Engine
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            activeProps={{ className: "text-foreground" }}
            className="hover:text-foreground"
          >
            Industries
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
