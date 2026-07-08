/**
 * BackOfficeLayout.tsx
 * ---------------------------------------------------------------------------
 * Shell/navigation wrapper for every back-office page (project list, project
 * edit, people manager). Rendered as the parent route element in App.tsx, so
 * `<Outlet />` is where the matched child route's page actually appears.
 */
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/storage/supabaseClient";
import { cn } from "@/lib/utils";

export function BackOfficeLayout() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/backoffice/projects" className="flex items-center gap-2 text-lg font-semibold">
            <img src="/app-icon.png" alt="" className="size-8" />
            Client Schedule
          </Link>
          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-1">
              <NavTab to="/backoffice/projects" icon={<Icon name="calendar_month" size={16} />} label="Projects" />
              <NavTab to="/backoffice/settings" icon={<Icon name="settings" size={16} />} label="Settings" />
            </nav>
            {email && (
              <div className="flex items-center gap-2 border-l pl-3">
                <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>
                <Button size="sm" variant="ghost" onClick={() => supabase.auth.signOut()}>
                  <Icon name="logout" size={16} />
                  Sign out
                </Button>
              </div>
            )}
          </div>
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
