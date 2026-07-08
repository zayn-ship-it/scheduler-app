/**
 * AuthGate.tsx
 * ---------------------------------------------------------------------------
 * Wraps the back office routes. Passwordless magic-link sign-in via Supabase
 * Auth, restricted to work emails at the domains in allowedDomains.ts - the
 * back office isn't open to the public.
 *
 * Domain is checked twice: once client-side before a magic link is even
 * sent (so an outsider never gets an email), and again after a session is
 * established (in case a session exists for a disallowed email some other
 * way) - if that second check fails, the session is signed out immediately.
 *
 * Sessions persist via Supabase's own default (localStorage + auto-refresh),
 * so someone who's signed in stays signed in across visits until they use
 * the "Sign out" button in BackOfficeLayout.tsx.
 */
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { supabase } from "@/lib/storage/supabaseClient";
import { isAllowedEmail } from "./allowedDomains";

export function AuthGate({ children }: { children: ReactNode }) {
  const [checkingSession, setCheckingSession] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const email = session?.user.email;
  const allowed = isAllowedEmail(email);

  useEffect(() => {
    if (session && !allowed) {
      supabase.auth.signOut();
    }
  }, [session, allowed]);

  if (checkingSession) return null;

  if (session && allowed) return <>{children}</>;

  return <SignInScreen deniedEmail={session && !allowed ? email : undefined} />;
}

function SignInScreen({ deniedEmail }: { deniedEmail?: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(
    deniedEmail ? `"${deniedEmail}" isn't authorized to access this back office.` : null,
  );
  const [linkSent, setLinkSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!isAllowedEmail(trimmed)) {
      setError("Only @rjf.agency, @runjumpfly.studio, or @runjumpflycreations.co.za emails can sign in.");
      return;
    }

    setSending(true);
    setError(null);
    try {
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: `${window.location.origin}/backoffice/projects` },
      });
      if (sendError) throw sendError;
      setLinkSent(true);
    } catch (err) {
      console.error("Failed to send magic link:", err);
      setError("Failed to send the sign-in link. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Icon name="mail_lock" size={64} className="mb-2 text-primary" />
          <CardTitle>Back Office Sign-in</CardTitle>
          <CardDescription>
            {linkSent
              ? "Check your email for a sign-in link."
              : "Enter your work email - we'll send you a link to sign in, no password needed."}
          </CardDescription>
        </CardHeader>
        {!linkSent && (
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="you@rjf.agency"
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? "Sending…" : "Send magic link"}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
