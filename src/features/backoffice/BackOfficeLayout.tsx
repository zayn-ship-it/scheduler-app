/**
 * BackOfficeLayout.tsx
 * ---------------------------------------------------------------------------
 * Shell/navigation wrapper for every back-office page (project list, project
 * edit, people manager). Rendered as the parent route element in App.tsx, so
 * `<Outlet />` is where the matched child route's page actually appears.
 */
import { NavLink, Outlet } from "react-router-dom";
import { CalendarRange, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackOfficeLayout() {
  return (
    <div className="min-h-svh bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="text-lg font-semibold">Client Schedule — Back Office</div>
          <nav className="flex items-center gap-1">
            <NavTab to="/backoffice/projects" icon={<CalendarRange className="size-4" />} label="Projects" />
            <NavTab to="/backoffice/settings" icon={<Settings className="size-4" />} label="Settings" />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function NavTab({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
